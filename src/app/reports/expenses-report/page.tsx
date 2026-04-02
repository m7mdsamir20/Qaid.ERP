'use client';

import React, { useState } from 'react';
import { C, CAIRO } from '@/constants/theme';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import { Search, FileText, Loader2 } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';

const PC = '#4f46e5';
const DC = '#ef4444';

export default function ExpensesReportPage() {
    const { symbol: cSymbol } = useCurrency();
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (from) params.set('from', from);
            if (to) params.set('to', to);
            const res = await fetch(`/api/reports/expenses-report?${params}`);
            if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'فشل في استخراج التقرير');
                return;
            }
            setData(await res.json());
        } catch { alert('فشل الاتصال بالخادم'); }
        finally { setLoading(false); }
    };

    return (
        <DashboardLayout>
            <div dir="rtl" style={{ width: '100%', paddingBottom: '60px' }}>
                <ReportHeader
                    title="تقرير المصروفات"
                    subtitle="عرض تفصيلي لجميع المصروفات المسجلة خلال فترة زمنية محددة."
                    backTab="treasury-bank"
                />

                {/* Filters */}
                <div className="no-print" style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <label style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#94a3b8', fontFamily: CAIRO, whiteSpace: 'nowrap' }}>من</label>
                            <input
                                type="date"
                                value={from}
                                onChange={(e) => setFrom(e.target.value)}
                                style={{ flex: 1, height: '42px', padding: '0 15px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, color: '#fff', direction: 'ltr', textAlign: 'left', colorScheme: 'dark' }}
                            />
                        </div>
                        <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <label style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#94a3b8', fontFamily: CAIRO, whiteSpace: 'nowrap' }}>إلى</label>
                            <input
                                type="date"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                style={{ flex: 1, height: '42px', padding: '0 15px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, color: '#fff', direction: 'ltr', textAlign: 'left', colorScheme: 'dark' }}
                            />
                        </div>
                        <button
                            onClick={fetchReport}
                            className="btn btn-primary"
                            style={{ height: '42px', padding: '0 30px', fontWeight: 800, gap: '10px', borderRadius: '12px', fontFamily: CAIRO, display: 'flex', alignItems: 'center' }}
                        >
                            <Search size={18} /> عرض التقرير
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: '100px', textAlign: 'center' }}>
                        <Loader2 size={40} className="animate-spin" style={{ color: PC }} />
                        <p style={{ marginTop: '20px', color: '#64748b', fontFamily: CAIRO }}>جاري استخراج التقرير...</p>
                    </div>
                ) : !data ? (
                    <div style={{ padding: '80px', textAlign: 'center', background: C.card, borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <FileText size={60} style={{ opacity: 0.1, marginBottom: '20px' }} />
                        <h3 style={{ color: '#64748b', fontSize: '15px', fontFamily: CAIRO }}>حدد الفترة الزمنية واضغط "عرض التقرير"</h3>
                    </div>
                ) : (
                    <div>
                        {/* Summary */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '24px' }}>
                            <div className="card" style={{ padding: '20px', borderRight: `4px solid ${DC}` }}>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '5px', fontFamily: CAIRO }}>إجمالي المصروفات</div>
                                <div style={{ fontSize: '22px', fontWeight: 900, color: DC, fontFamily: CAIRO }}>
                                    {Number(data.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {cSymbol}
                                </div>
                            </div>
                            <div className="card" style={{ padding: '20px', borderRight: `4px solid #64748b` }}>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '5px', fontFamily: CAIRO }}>عدد العمليات</div>
                                <div style={{ fontSize: '22px', fontWeight: 900, color: '#fff', fontFamily: CAIRO }}>{data.rows.length}</div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="table-container" style={{ background: C.card, borderRadius: '18px', overflow: 'hidden', border: `1px solid ${C.border}` }}>
                            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)' }}>
                                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#f1f5f9', fontFamily: CAIRO }}>تفاصيل المصروفات</h3>
                            </div>
                            {data.rows.length === 0 ? (
                                <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontFamily: CAIRO }}>
                                    لا توجد مصروفات في هذه الفترة
                                </div>
                            ) : (
                                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                                            <th style={{ padding: '14px 16px', fontSize: '12px', textAlign: 'right', color: '#94a3b8', fontFamily: CAIRO }}>رقم القيد</th>
                                            <th style={{ padding: '14px 16px', fontSize: '12px', textAlign: 'right', color: '#94a3b8', fontFamily: CAIRO }}>التاريخ</th>
                                            <th style={{ padding: '14px 16px', fontSize: '12px', textAlign: 'right', color: '#94a3b8', fontFamily: CAIRO }}>البيان</th>
                                            <th style={{ padding: '14px 16px', fontSize: '12px', textAlign: 'right', color: '#94a3b8', fontFamily: CAIRO }}>حساب المصروف</th>
                                            <th style={{ padding: '14px 16px', fontSize: '12px', textAlign: 'right', color: '#94a3b8', fontFamily: CAIRO }}>المصدر</th>
                                            <th style={{ padding: '14px 16px', fontSize: '12px', textAlign: 'center', color: DC, fontFamily: CAIRO }}>المبلغ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.rows.map((row: any) => (
                                            <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                <td style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8', fontFamily: CAIRO }}>#{row.entryNumber}</td>
                                                <td style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8', fontFamily: CAIRO, direction: 'ltr' }}>
                                                    {new Date(row.date).toLocaleDateString('en-GB')}
                                                </td>
                                                <td style={{ padding: '14px 16px', fontSize: '12px', color: '#e2e8f0', fontFamily: CAIRO }}>{row.description}</td>
                                                <td style={{ padding: '14px 16px', fontSize: '12px', color: '#e2e8f0', fontFamily: CAIRO }}>{row.expenseAccountName}</td>
                                                <td style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8', fontFamily: CAIRO }}>
                                                    <span style={{
                                                        padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                                                        background: row.sourceType === 'bank' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)',
                                                        color: row.sourceType === 'bank' ? '#60a5fa' : '#34d399',
                                                    }}>
                                                        {row.sourceName}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 800, color: DC, fontFamily: CAIRO }}>
                                                    {Number(row.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot style={{ background: 'rgba(255,255,255,0.03)', borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                                        <tr>
                                            <td colSpan={5} style={{ padding: '18px 16px', textAlign: 'right', fontWeight: 800, color: '#f1f5f9', fontFamily: CAIRO }}>الإجمالي</td>
                                            <td style={{ padding: '18px 16px', textAlign: 'center', fontWeight: 900, fontSize: '15px', color: DC, fontFamily: CAIRO }}>
                                                {Number(data.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {cSymbol}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @media print {
                    .no-print { display: none !important; }
                    body { background: #fff !important; color: #000 !important; }
                    th, td { color: #000 !important; border-bottom: 1px solid #eee !important; }
                }
            `}</style>
        </DashboardLayout>
    );
}
