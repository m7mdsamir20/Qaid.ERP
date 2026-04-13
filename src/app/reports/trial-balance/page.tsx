'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import { useSession } from 'next-auth/react';
import { FileBarChart2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { C, CAIRO, PAGE_BASE, INTER } from '@/constants/theme';

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};

const fmt = (n: number) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

    const fetchData = async () => {
        try {
            const res = await fetch('/api/reports/trial-balance');
            if (res.ok) {
                setReport(await res.json());
            }
        } catch {
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const grandTotalDebit = report.reduce((s, l) => s + l.totalDebit, 0);
    const grandTotalCredit = report.reduce((s, l) => s + l.totalCredit, 0);
    const grandBalanceDebit = report.reduce((s, l) => s + l.balanceDebit, 0);
    const grandBalanceCredit = report.reduce((s, l) => s + l.balanceCredit, 0);

    const isBalanced = Math.abs(grandBalanceDebit - grandBalanceCredit) < 0.001;

    const exportToPDF = () => window.print();

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title="ميزان المراجعة"
                    subtitle="تقرير إجمالي حركة الحسابات وأرصدتها للسنة المالية النشطة للتأكد من اتزان القيود المزدوجة."
                    backTab="financial"
                    onExportPdf={exportToPDF}
                    printTitle="ميزان المراجعة (بالمجاميع والأرصدة)"
                />

                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', flexDirection: 'column', gap: '16px' }}>
                        <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                        <span style={{ fontWeight: 600, fontFamily: CAIRO, color: C.textSecondary }}>جاري توليد التقرير...</span>
                    </div>
                ) : report.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', flexDirection: 'column', gap: '20px', textAlign: 'center' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileBarChart2 size={40} style={{ opacity: 0.3, color: C.textMuted }} />
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>لا توجد بيانات متاحة</h3>
                        <p style={{ fontSize: '14px', color: C.textMuted, maxWidth: '400px', lineHeight: 1.6, fontFamily: CAIRO }}>يجب ترحيل قيود يومية لظهور الحركات المحاسبية في الميزان المحاسبي</p>
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
                                <span style={{ fontSize: '13px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>حالة اتزان الميزان:</span>
                                <span style={{ color: isBalanced ? C.success : C.danger, fontWeight: 900, fontSize: '14px', fontFamily: CAIRO }}>
                                    {isBalanced ? 'متزن محـاسبياً (المجاميع متطابقة)' : 'غير متزن (يوجد خلل في الترحيل)'}
                                </span>
                            </div>
                            <div style={{ fontSize: '12px', color: C.textMuted, fontWeight: 600, fontFamily: CAIRO }}>
                                إجمالي الحسابات المسجلة: <span style={{ color: C.textPrimary, fontWeight: 800, fontFamily: INTER }}>{report.length}</span>
                            </div>
                        </div>

                        <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                        <th rowSpan={2} style={{ padding: '16px', textAlign: 'start', fontSize: '13px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO, borderInlineStart: `1px solid ${C.border}` }}>رمز الحساب</th>
                                        <th rowSpan={2} style={{ padding: '16px', textAlign: 'start', fontSize: '13px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO, borderInlineStart: `1px solid ${C.border}` }}>اسم الحساب</th>
                                        <th colSpan={2} style={{ padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: 900, background: 'rgba(59, 130, 246, 0.05)', color: '#60a5fa', fontFamily: CAIRO, borderBottom: `1px solid ${C.border}`, borderInlineStart: `1px solid ${C.border}` }}>بالمجاميع (المعاملات)</th>
                                        <th colSpan={2} style={{ padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: 900, background: 'rgba(139, 92, 246, 0.05)', color: '#a78bfa', fontFamily: CAIRO, borderBottom: `1px solid ${C.border}` }}>بالأرصدة (النهائي)</th>
                                    </tr>
                                    <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: `1px solid ${C.border}` }}>
                                        <th style={{ padding: '10px', textAlign: 'center', fontSize: '11px', fontWeight: 800, color: C.textMuted, fontFamily: CAIRO, borderInlineStart: `1px solid ${C.border}` }}>مدين</th>
                                        <th style={{ padding: '10px', textAlign: 'center', fontSize: '11px', fontWeight: 800, color: C.textMuted, fontFamily: CAIRO, borderInlineStart: `1px solid ${C.border}` }}>دائن</th>
                                        <th style={{ padding: '10px', textAlign: 'center', fontSize: '11px', fontWeight: 800, color: C.textMuted, fontFamily: CAIRO, borderInlineStart: `1px solid ${C.border}` }}>مدين</th>
                                        <th style={{ padding: '10px', textAlign: 'center', fontSize: '11px', fontWeight: 800, color: C.textMuted, fontFamily: CAIRO }}>دائن</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.map((line) => (
                                        <tr key={line.code} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '14px 16px', fontSize: '12px', color: C.textMuted, fontFamily: INTER, borderInlineStart: `1px solid ${C.border}` }}>
                                                <span style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: `1px solid ${C.border}` }}>{line.code}</span>
                                            </td>
                                            <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO, borderInlineStart: `1px solid ${C.border}` }}>{line.name}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', color: line.totalDebit > 0 ? C.textPrimary : C.textMuted, fontFamily: INTER, borderInlineStart: `1px solid ${C.border}` }}>{line.totalDebit > 0 ? fmt(line.totalDebit) : '0.00'}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', color: line.totalCredit > 0 ? C.textPrimary : C.textMuted, fontFamily: INTER, borderInlineStart: `1px solid ${C.border}` }}>{line.totalCredit > 0 ? fmt(line.totalCredit) : '0.00'}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 800, color: line.balanceDebit > 0 ? C.success : C.textMuted, background: 'rgba(16, 185, 129, 0.01)', fontFamily: INTER, borderInlineStart: `1px solid ${C.border}` }}>{line.balanceDebit > 0 ? fmt(line.balanceDebit) : '0.00'}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 800, color: line.balanceCredit > 0 ? C.danger : C.textMuted, background: 'rgba(239, 68, 68, 0.01)', fontFamily: INTER }}>{line.balanceCredit > 0 ? fmt(line.balanceCredit) : '0.00'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot style={{ background: 'rgba(59, 130, 246, 0.05)', borderTop: `2px solid ${C.primary}44` }}>
                                    <tr>
                                        <td colSpan={2} style={{ padding: '18px 24px', fontWeight: 950, textAlign: 'start', fontSize: '14px', color: C.textPrimary, fontFamily: CAIRO, borderInlineStart: `1px solid ${C.border}` }}>الإجماليات الكلية للميزان</td>
                                        <td style={{ padding: '18px 16px', textAlign: 'center', fontWeight: 900, color: C.textPrimary, fontSize: '13px', fontFamily: INTER, borderInlineStart: `1px solid ${C.border}` }}>{fmt(grandTotalDebit)}</td>
                                        <td style={{ padding: '18px 16px', textAlign: 'center', fontWeight: 900, color: C.textPrimary, fontSize: '13px', fontFamily: INTER, borderInlineStart: `1px solid ${C.border}` }}>{fmt(grandTotalCredit)}</td>
                                        <td style={{ padding: '18px 16px', textAlign: 'center', fontWeight: 950, color: C.success, fontSize: '14px', background: 'rgba(16, 185, 129, 0.05)', fontFamily: INTER, borderInlineStart: `1px solid ${C.border}` }}>{fmt(grandBalanceDebit)}</td>
                                        <td style={{ padding: '18px 16px', textAlign: 'center', fontWeight: 950, color: C.danger, fontSize: '14px', background: 'rgba(239, 68, 68, 0.05)', fontFamily: INTER }}>{fmt(grandBalanceCredit)}</td>
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

