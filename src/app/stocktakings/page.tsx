'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
    ClipboardList, Plus, Printer, Trash2, Loader2, ListChecks, CheckCircle2, FileText, AlertCircle
} from 'lucide-react';
import {
    C, CAIRO, INTER, PAGE_BASE, BTN_PRIMARY, TABLE_STYLE, focusIn, focusOut
} from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';

interface StocktakingLine {
    item: { name: string };
    systemQuantity: number;
    actualQuantity: number;
    difference: number;
}

interface Stocktaking {
    id: string;
    stocktakingNum: number;
    date: string;
    warehouse: { name: string };
    status: string;
    notes: string;
    lines: StocktakingLine[];
}

export default function StocktakingsPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const [stocktakings, setStocktakings] = useState<Stocktaking[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteItem, setDeleteItem] = useState<Stocktaking | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/stocktakings');
            if (res.ok) setStocktakings(await res.json());
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDeleteDraft = async () => {
        if (!deleteItem) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/stocktakings/${deleteItem.id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setDeleteItem(null);
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || 'فشل الحذف');
            }
        } catch {
            alert('حدث خطأ');
        } finally {
            setIsDeleting(false);
        }
    };

    const printStocktaking = (st: Stocktaking) => {
        const printLines = st.lines;
        const printWarehouse = st.warehouse?.name || '—';
        const printDate = new Date(st.date).toLocaleDateString('en-GB');
        const printNumber = `STK-${st.stocktakingNum}`;
        const printNotes = st.notes;

        const html = `
            <!DOCTYPE html>
            <html dir={isRtl ? 'rtl' : 'ltr'} lang="ar">
            <head>
                <meta charset="utf-8">
                <title>طباعة جرد المخزون</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
                    body { font-family: 'Cairo', sans-serif; padding: 40px; color: #1e293b; background: #fff; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
                    .header h1 { margin: 0 0 10px; font-size: 24px; color: #0f172a; }
                    .details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
                    .detail-item { font-size: 14px; }
                    .detail-label { font-weight: bold; color: #64748b; margin-bottom: 4px; display: block; }
                    .detail-value { font-weight: 700; color: #0f172a; }
                    table { width: 100%; border-collapse: collapse; margin-block: 20px; }
                    th, td { border: 1px solid #cbd5e1; padding: 12px 16px; text-align: right; }
                    th { background: #f1f5f9; color: #334155; font-weight: 800; }
                    .blank-cell { background: #fdfdfd; min-width: 80px; }
                    @media print {
                        body { padding: 0; }
                        button { display: none; }
                        @page { margin: 1cm; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>نموذج جرد مخزون</h1>
                    <div style="font-size:14px; color:#64748b;">(${printNumber})</div>
                </div>
                <div class="details">
                    <div class="detail-item">
                        <span class="detail-label">التاريخ:</span>
                        <span class="detail-value">${printDate}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">المخزن:</span>
                        <span class="detail-value">${printWarehouse}</span>
                    </div>
                </div>
                ${printNotes ? `<div style="margin-bottom:20px; font-size:14px;"><strong>ملاحظات:</strong> ${printNotes}</div>` : ''}
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 50px;">#</th>
                            <th>الصنف</th>
                            <th style="width: 120px; text-align: center;">الرصيد الدفتري</th>
                            <th style="width: 120px; text-align: center;">الرصيد الفعلي</th>
                            <th style="width: 150px; text-align: center;">ملاحظات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${printLines.map((l, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td><strong>${l.item?.name || '—'}</strong></td>
                                <td style="text-align: center; color: #64748b;">${l.systemQuantity}</td>
                                <td class="blank-cell"></td>
                                <td class="blank-cell"></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div style="margin-top: 50px; display: flex; justify-content: space-between; font-size: 14px;">
                    <div>توقيع أمين المخزن: _____________________</div>
                    <div>توقيع المراجع: _____________________</div>
                </div>
            </body>
            </html>
        `;
        const printWindow = window.open('', '', 'width=900,height=700');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        }
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ ...PAGE_BASE, background: C.bg, minHeight: '100vh', fontFamily: CAIRO }}>
                
                <PageHeader 
                    title="جرد المخازن" 
                    subtitle="متابعة عمليات جرد المخزون، تسوية الأرصدة الفعلية مع السجلات الدفتيرية" 
                    icon={ClipboardList} 
                    primaryButton={{
                        label: "جلسة جرد جديدة",
                        onClick: () => router.push('/stocktakings/new'),
                        icon: Plus
                    }}
                />

                {/* Main Table Content */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '100px', color: C.textMuted }}>
                        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: C.primary, margin: '0 auto 16px' }} />
                        <p style={{ fontWeight: 600 }}>جاري تحميل سجلات الجرد...</p>
                    </div>
                ) : stocktakings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 20px', color: C.textMuted }}>
                        <ClipboardList size={56} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.1 }} />
                        <p style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>لا توجد سجلات جرد مسجلة حالياً</p>
                    </div>
                ) : (
                    <div style={TABLE_STYLE.container}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={TABLE_STYLE.th(true)}>رقم الجرد</th>
                                        <th style={TABLE_STYLE.th(false)}>التاريخ</th>
                                        <th style={TABLE_STYLE.th(false)}>المخزن</th>
                                        <th style={TABLE_STYLE.th(false)}>الحالة</th>
                                        <th style={TABLE_STYLE.th(false)}>التعديلات</th>
                                        <th style={TABLE_STYLE.th(false)}>ملاحظات</th>
                                        <th style={TABLE_STYLE.th(false)}>إجراء</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stocktakings.map((st, idx) => (
                                        <tr key={st.id} 
                                            style={TABLE_STYLE.row(idx === stocktakings.length - 1)}
                                            onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.15)'}
                                        >
                                            <td style={{ ...TABLE_STYLE.td(true), width: '100px' }}>
                                                <div style={{ color: C.primary, fontWeight: 900, fontFamily: INTER, fontSize: '11px', opacity: 0.75 }}>
                                                    STK-{st.stocktakingNum}
                                                </div>
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center', color: C.textSecondary, fontSize: '12px', fontWeight: 600 }}>
                                                {new Date(st.date).toLocaleDateString('en-GB')}
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                <div style={{ fontWeight: 800, color: C.textPrimary, fontSize: '13px' }}>{st.warehouse?.name || '—'}</div>
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                {st.status === 'applied' ? (
                                                    <span style={{ 
                                                        display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', 
                                                        background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399', fontSize: '11px', fontWeight: 800 
                                                    }}>
                                                        <CheckCircle2 size={12} /> مُطبق
                                                    </span>
                                                ) : (
                                                    <span style={{ 
                                                        display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', 
                                                        background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#fbbf24', fontSize: '11px', fontWeight: 800 
                                                    }}>
                                                        <FileText size={12} /> مسودة
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                                    {st.lines.filter(l => l.difference !== 0).length > 0 ? st.lines.filter(l => l.difference !== 0).map((l, i) => (
                                                        <div key={i} style={{ 
                                                            fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.03)', 
                                                            border: `1px solid ${l.difference > 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                                                            color: l.difference > 0 ? '#34d399' : '#f87171',
                                                            fontWeight: 600,
                                                            width: 'fit-content'
                                                        }}>
                                                            {l.item?.name} ({l.difference > 0 ? '+' : ''}{l.difference})
                                                        </div>
                                                    )) : <span style={{ color: C.textMuted, fontSize: '11px' }}>لا يوجد فروقات</span>}
                                                </div>
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), color: C.textMuted, fontSize: '12px', fontWeight: 500, maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {st.notes || '—'}
                                            </td>
                                            <td style={TABLE_STYLE.td(false)}>
                                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                                                    <button onClick={() => printStocktaking(st)}
                                                        style={{ 
                                                            width: 32, height: 32, borderRadius: '8px', border: `1px solid ${C.border}`, 
                                                            background: 'rgba(255,255,255,0.03)', color: C.textSecondary, 
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' 
                                                        }}
                                                        onMouseEnter={e => e.currentTarget.style.color = C.blue}
                                                        onMouseLeave={e => e.currentTarget.style.color = C.textSecondary}
                                                        title="طباعة نموذج الجرد"
                                                    >
                                                        <Printer size={15} />
                                                    </button>
                                                    {st.status === 'draft' && (
                                                        <button onClick={() => setDeleteItem(st)}
                                                            style={{ 
                                                                width: 32, height: 32, borderRadius: '8px', border: `1px solid ${C.danger}30`, 
                                                                background: 'rgba(251,113,133,0.05)', color: C.danger, 
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' 
                                                            }}
                                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,113,133,0.15)'}
                                                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(251,113,133,0.05)'}
                                                            title="حذف المسودة"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                <AppModal
                    show={!!deleteItem}
                    onClose={() => setDeleteItem(null)}
                    title="حذف مسودة الجرد"
                    icon={Trash2}
                    variant="danger"
                    maxWidth="400px"
                >
                    <div style={{ textAlign: 'center', padding: '10px 0' }}>
                        <div style={{ 
                            width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', 
                            color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' 
                        }}>
                            <AlertCircle size={32} />
                        </div>
                        <h3 style={{ margin: '0 0 8px', color: C.textPrimary }}>هل أنت متأكد؟</h3>
                        <p style={{ margin: 0, color: C.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
                            سيتم حذف مسودة الجرد رقم <strong>"STK-{deleteItem?.stocktakingNum}"</strong> نهائياً. لا يمكن التراجع عن هذا الإجراء.
                        </p>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button onClick={handleDeleteDraft} disabled={isDeleting} 
                                style={{ flex: 1.5, height: '45px', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                                {isDeleting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'نعم، احذف المسودة'}
                            </button>
                            <button type="button" onClick={() => setDeleteItem(null)} 
                                style={{ flex: 1, height: '45px', borderRadius: '10px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontWeight: 700, cursor: 'pointer' }}>
                                إلغاء
                            </button>
                        </div>
                    </div>
                </AppModal>

            </div>
            <style jsx global>{` @keyframes spin { to { transform:rotate(360deg); } } `}</style>
        </DashboardLayout>
    );
}
