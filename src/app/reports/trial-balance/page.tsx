'use client';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import { Currency } from '@/components/Currency';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import CustomSelect from '@/components/CustomSelect';
import { useSession } from 'next-auth/react';
import { FileBarChart2, CheckCircle2, AlertCircle } from 'lucide-react';
import { C, CAIRO, PAGE_BASE, OUTFIT } from '@/constants/theme';

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
            if (branchId) params.set('branchId', branchId);
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

    const columns: TableColumn[] = [
        {
            header: t('رمز الحساب'),
            cell: (row: TrialBalanceLine) => (
                <span className="notranslate" translate="no" style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: `1px solid ${C.border}` }}>{row.code}</span>
            ),
            style: { fontFamily: OUTFIT, fontSize: '13px', color: C.textSecondary }
        },
        {
            header: t('اسم الحساب'),
            cell: (row: TrialBalanceLine) => row.name,
            style: { fontFamily: CAIRO, fontSize: '13px', fontWeight: 600, color: C.textSecondary }
        },
        {
            header: t('مدين'),
            type: 'number' as const,
            cell: (row: TrialBalanceLine) => (
                <span style={{ color: row.totalDebit > 0 ? C.textPrimary : C.textMuted }}>
                    {row.totalDebit > 0 ? <Currency amount={row.totalDebit} /> : '0.00'}
                </span>
            ),
            style: { fontFamily: OUTFIT, fontSize: '13px', textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('دائن'),
            type: 'number' as const,
            cell: (row: TrialBalanceLine) => (
                <span style={{ color: row.totalCredit > 0 ? C.textPrimary : C.textMuted }}>
                    {row.totalCredit > 0 ? <Currency amount={row.totalCredit} /> : '0.00'}
                </span>
            ),
            style: { fontFamily: OUTFIT, fontSize: '13px', textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('مدين'),
            type: 'number' as const,
            cell: (row: TrialBalanceLine) => (
                <span style={{ color: row.balanceDebit > 0 ? C.success : C.textMuted }}>
                    {row.balanceDebit > 0 ? <Currency amount={row.balanceDebit} /> : '0.00'}
                </span>
            ),
            style: { fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, background: 'rgba(16, 185, 129, 0.01)', textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('دائن'),
            type: 'number' as const,
            cell: (row: TrialBalanceLine) => (
                <span style={{ color: row.balanceCredit > 0 ? C.danger : C.textMuted }}>
                    {row.balanceCredit > 0 ? <Currency amount={row.balanceCredit} /> : '0.00'}
                </span>
            ),
            style: { fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, background: 'rgba(239, 68, 68, 0.01)', textAlign: 'center' } as React.CSSProperties
        }
    ];

    const customHeader = (
        <>
            <tr style={{ background: C.subtle, borderBottom: `1px solid ${C.border}` }}>
                <th rowSpan={2} style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO, borderBottom: `1px solid ${C.border}`, textAlign: 'start' }}>{t('رمز الحساب')}</th>
                <th rowSpan={2} style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO, borderBottom: `1px solid ${C.border}`, textAlign: 'start' }}>{t('اسم الحساب')}</th>
                <th colSpan={2} style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 700, background: 'rgba(37, 106, 244, 0.03)', color: C.primary, fontFamily: CAIRO, borderBottom: `1px solid ${C.border}`, textAlign: 'center' }}>{t('بالمجاميع (المعاملات)')}</th>
                <th colSpan={2} style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 700, background: 'rgba(139, 92, 246, 0.03)', color: '#a78bfa', fontFamily: CAIRO, borderBottom: `1px solid ${C.border}`, textAlign: 'center' }}>{t('بالأرصدة (النهائي)')}</th>
            </tr>
            <tr style={{ background: C.subtle, borderBottom: `1px solid ${C.border}` }}>
                <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO, borderBottom: `1px solid ${C.border}`, textAlign: 'center' }}>{t('مدين')}</th>
                <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO, borderBottom: `1px solid ${C.border}`, textAlign: 'center' }}>{t('دائن')}</th>
                <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO, borderBottom: `1px solid ${C.border}`, textAlign: 'center' }}>{t('مدين')}</th>
                <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO, textAlign: 'center' }}>{t('دائن')}</th>
            </tr>
        </>
    );

    const footerElement = (
        <tr style={{ background: 'rgba(37, 106, 244, 0.05)', borderTop: `2px solid ${C.primary}44` }}>
            <td colSpan={2} style={{ padding: '18px 20px', fontWeight: 950, fontSize: '13px', color: C.textPrimary, fontFamily: CAIRO }}>{t('الإجماليات الكلية للميزان')}</td>
            <td style={{ padding: '18px 20px', fontWeight: 600, color: C.textPrimary, fontSize: '13px', fontFamily: OUTFIT, textAlign: 'center' }}><Currency amount={grandTotalDebit} /></td>
            <td style={{ padding: '18px 20px', fontWeight: 600, color: C.textPrimary, fontSize: '13px', fontFamily: OUTFIT, textAlign: 'center' }}><Currency amount={grandTotalCredit} /></td>
            <td style={{ padding: '18px 20px', fontWeight: 950, color: C.success, fontSize: '13px', background: 'rgba(16, 185, 129, 0.05)', fontFamily: OUTFIT, textAlign: 'center' }}><Currency amount={grandBalanceDebit} /></td>
            <td style={{ padding: '18px 20px', fontWeight: 950, color: C.danger, fontSize: '13px', background: 'rgba(239, 68, 68, 0.05)', fontFamily: OUTFIT, textAlign: 'center' }}><Currency amount={grandBalanceCredit} /></td>
        </tr>
    );

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("ميزان المراجعة")}
                    subtitle={t("تقرير إجمالي حركة الحسابات وأرصدتها للسنة المالية النشطة للتأكد من اتزان القيود المزدوجة.")}
                    backTab="financial"
                    printTitle={t("ميزان المراجعة (بالمجاميع والأرصدة)")}
                    branchName={branchId === 'all' ? t('كل الفروع') : (branches.find(b => b.id === branchId)?.name || '')}
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

                {/* Balance Status Card */}
                {!loading && report.length > 0 && (
                    <div data-print-stats style={{
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
                )}

                <DataTable
                    columns={columns}
                    data={report}
                    emptyIcon={FileBarChart2}
                    emptyMessage={t('لا توجد بيانات متاحة. يجب ترحيل قيود يومية لظهور الحركات المحاسبية في الميزان المحاسبي.')}
                    isLoading={loading}
                    customHeader={customHeader}
                    footer={footerElement}
                />
            </div>

            <style>{`
                .print-only { display: none; }
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
