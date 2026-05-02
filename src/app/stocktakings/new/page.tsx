'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { ClipboardList, ListChecks, Loader2, Printer, Building2, ArrowRight, Save, CheckCircle2, FileText, AlertTriangle } from 'lucide-react';
import { C, CAIRO, OUTFIT, PAGE_BASE, BTN_PRIMARY, TABLE_STYLE, focusIn, focusOut, LS, IS, SC } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';

interface Warehouse { id: string; name: string }
interface Item { id: string; name: string }

export default function NewStocktakingPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [stocks, setStocks] = useState<{ itemId: string, warehouseId: string, quantity: number }[]>([]);

    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const { data: session } = useSession();
    const isRestaurants = (session?.user as any)?.businessType?.toUpperCase() === 'RESTAURANTS';

    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        warehouseId: '',
        notes: '',
        status: 'draft' // 'draft' or 'applied'
    });

    const [lines, setLines] = useState<{ itemId: string, systemQuantity: number, actualQuantity: number, difference: number }[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const itemsUrl = isRestaurants ? '/api/items?all=true&type=raw_material' : '/api/items?all=true';
            const [whRes, itemsRes, stocksRes] = await Promise.all([
                fetch('/api/warehouses'), fetch(itemsUrl), fetch('/api/stocks')
            ]);
            let whData = [];
            let itData: any = [];
            let stData = [];
            if (whRes.ok) whData = await whRes.json();
            if (itemsRes.ok) itData = await itemsRes.json();
            if (stocksRes.ok) stData = await stocksRes.json();

            setWarehouses(Array.isArray(whData) ? whData : []);
            setItems(Array.isArray(itData) ? itData : (itData.items || []));
            setStocks(Array.isArray(stData) ? stData : []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            
            // Set Default Warehouse after load
            const lastWh = localStorage.getItem('last_warehouse_id');
            const whs = await (await fetch('/api/warehouses')).json(); // Small redundancy to ensure correct data
            if (lastWh && whs.some((w: any) => w.id === lastWh)) {
                handleWarehouseSelect(lastWh);
            }
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleWarehouseSelect = (wid: string) => {
        setForm(prev => ({ ...prev, warehouseId: wid }));
        localStorage.setItem('last_warehouse_id', wid);
        if (!wid) { setLines([]); return; }

        if (!Array.isArray(items)) { setLines([]); return; }
        const defaultLines = items.map(item => {
            const stockRecord = Array.isArray(stocks) ? stocks.find(s => s.itemId === item.id && s.warehouseId === wid) : null;
            const sysQty = stockRecord ? stockRecord.quantity : 0;
            return {
                itemId: item.id,
                systemQuantity: sysQty,
                actualQuantity: sysQty,
                difference: 0
            };
        });
        setLines(defaultLines);
    }

    const updateActualQuantity = (index: number, actualQ: number) => {
        const newLines = [...lines];
        const sysQ = newLines[index].systemQuantity;
        newLines[index].actualQuantity = actualQ;
        newLines[index].difference = actualQ - sysQ;
        setLines(newLines);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.warehouseId || lines.length === 0) return;
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/stocktakings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, lines: lines.filter(l => l.actualQuantity !== l.systemQuantity || form.status === 'draft') }),
            });
            if (res.ok) {
                router.push('/stocktakings');
            } else {
                alert(t('فشل حفظ تسوية الجرد'));
                setIsSubmitting(false);
            }
        } catch {
            alert(t('حدث خطأ'));
            setIsSubmitting(false);
        }
    };

    const printStocktaking = () => {
        const printWarehouse = warehouses.find(w => w.id === form.warehouseId)?.name || '—';
        const printDate = new Date(form.date).toLocaleDateString('en-GB');
        const printNumber = t('مسودة جديدة');
        const printNotes = form.notes;

        const html = `
            <!DOCTYPE html>
            <html dir={isRtl ? 'rtl' : 'ltr'} lang="ar">
            <head>
                <meta charset="utf-8">
                <title>${t('طباعة جرد المخزون')}</title>
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
                    <h1>${t('نموذج جرد مخزون')}</h1>
                    <div style="font-size:14px; color:#64748b;">(${printNumber})</div>
                </div>
                <div class="details">
                    <div class="detail-item">
                        <span class="detail-label">${t('التاريخ')}:</span>
                        <span class="detail-value">${printDate}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">${t('المخزن')}:</span>
                        <span class="detail-value">${printWarehouse}</span>
                    </div>
                </div>
                ${printNotes ? `<div style="margin-bottom:20px; font-size:14px;"><strong>${t('ملاحظات')}:</strong> ${printNotes}</div>` : ''}
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 50px;">#</th>
                            <th>${t('الصنف')}</th>
                            <th style="width: 120px; text-align: center;">${t('الرصيد الدفتري')}</th>
                            <th style="width: 120px; text-align: center;">${t('الرصيد الفعلي')}</th>
                            <th style="width: 150px; text-align: center;">${t('ملاحظات')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${lines.map((l, i) => {
                            const itemName = items.find(it => it.id === l.itemId)?.name;
                            return `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td><strong>${itemName || '—'}</strong></td>
                                    <td style="text-align: center; color: #64748b;">${l.systemQuantity}</td>
                                    <td class="blank-cell"></td>
                                    <td class="blank-cell"></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                <div style="margin-top: 50px; display: flex; justify-content: space-between; font-size: 14px;">
                    <div>${t('توقيع أمين المخزن')}: _____________________</div>
                    <div>${t('توقيع المراجع')}: _____________________</div>
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

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px', color: C.textSecondary }}>
                    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: C.primary, margin: '0 auto 16px' }} />
                    <p style={{ fontWeight: 600 }}>{t('جاري استرجاع البيانات...')}</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ ...PAGE_BASE, background: C.bg, minHeight: '100vh', fontFamily: CAIRO }}>
                
                <PageHeader 
                    title={t("جلسة جرد جديدة")} 
                    subtitle={t("بدء جلسة جرد لمستودع محدد وتوثيق الفروقات بين الرصيد الفعلي والدفتري")} 
                    icon={ClipboardList} 
                    backUrl="/stocktakings"
                />

                <div style={{ 
                    ...SC, 
                    background: C.card, 
                    borderRadius: '20px', 
                    padding: '24px', 
                    boxShadow: '0 4px 24px rgba(0,0,0,0.2)' 
                }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* Session Header Fields */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                            <div>
                                <label style={{ ...LS, fontSize: '11px' }}>{t('تاريخ الجرد')} <span style={{ color: C.danger }}>*</span></label>
                                <input 
                                    type="date" required 
                                    value={form.date} 
                                    onChange={e => setForm({ ...form, date: e.target.value })} 
                                    style={{ ...IS, height: '42px', fontSize: '13px', fontFamily: OUTFIT }} 
                                    onFocus={focusIn} onBlur={focusOut} 
                                />
                            </div>
                            <div>
                                <label style={{ ...LS, fontSize: '11px' }}>{t('المخزن المُستهدف')} <span style={{ color: C.danger }}>*</span></label>
                                <CustomSelect
                                    value={form.warehouseId}
                                    onChange={handleWarehouseSelect}
                                    placeholder={t("اختر المخزن للبدء...")}
                                    options={warehouses.map(w => ({ value: w.id, label: w.name, icon: Building2 }))}
                                />
                            </div>
                            <div>
                                <label style={{ ...LS, fontSize: '11px' }}>{t('إجراء التسوية')}</label>
                                <CustomSelect
                                    value={form.status}
                                    onChange={v => setForm({ ...form, status: v })}
                                    options={[
                                        { value: 'draft', label: t('مسودة (حفظ فقط)'), icon: FileText },
                                        { value: 'applied', label: t('تسوية الأرصدة (تحديث المخزون)'), icon: CheckCircle2 }
                                    ]}
                                />
                            </div>
                        </div>

                        {/* Stocktaking Table */}
                        {form.warehouseId && (
                            <div style={TABLE_STYLE.container}>
                                <table style={TABLE_STYLE.table}>
                                    <thead>
                                        <tr style={TABLE_STYLE.thead}>
                                            <th style={{ ...TABLE_STYLE.th(true), fontSize: '11px' }}>{t('الصنف')}</th>
                                            <th style={{ ...TABLE_STYLE.th(false, true), fontSize: '11px' }}>{t('الرصيد الدفتري')}</th>
                                            <th style={{ ...TABLE_STYLE.th(false, true), fontSize: '11px' }}>{t('الرصيد الفعلي')}</th>
                                            <th style={{ ...TABLE_STYLE.th(false, true), fontSize: '11px' }}>{t('الفارق')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lines.map((line, index) => {
                                            const itemName = items.find(i => i.id === line.itemId)?.name;
                                            return (
                                                <tr key={index} style={TABLE_STYLE.row(index === lines.length - 1)}>
                                                    <td style={{ ...TABLE_STYLE.td(true), fontWeight: 700, color: C.textPrimary, fontSize: '12px' }}>{itemName}</td>
                                                    <td style={{ ...TABLE_STYLE.td(false, true),  fontFamily: OUTFIT, fontWeight: 700, color: C.textSecondary, fontSize: '12px' }}>{line.systemQuantity}</td>
                                                    <td style={{ ...TABLE_STYLE.td(false, true), padding: '8px 12px', width: '150px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                            <input 
                                                                type="number" step="0.01" 
                                                                required={form.status === 'applied'}
                                                                value={line.actualQuantity === 0 && line.systemQuantity === 0 && line.difference === 0 ? '' : line.actualQuantity}
                                                                onChange={e => updateActualQuantity(index, parseFloat(e.target.value || '0'))}
                                                                placeholder="0"
                                                                style={{ ...IS, height: '36px', width: '100px',  background: 'rgba(255,255,255,0.03)', fontSize: '12px' }}
                                                                onFocus={focusIn} onBlur={focusOut}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td style={{ ...TABLE_STYLE.td(false, true),  fontFamily: OUTFIT, fontWeight: 600, color: line.difference > 0 ? '#34d399' : (line.difference < 0 ? '#f87171' : C.textMuted), fontSize: '13px' }}>
                                                        {line.difference > 0 ? '+' : ''}{line.difference}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {!form.warehouseId && (
                            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', background: 'rgba(255,255,255,0.01)', borderRadius: '16px', border: `1px dashed ${C.border}` }}>
                                <Building2 size={40} style={{ color: C.textSecondary, opacity: 0.3, marginBottom: '16px' }} />
                                <p style={{ color: C.textSecondary, fontSize: '13px', fontWeight: 600 }}>{t('يرجى اختيار المخزن أولاً لعرض قائمة الأصناف الحالية')}</p>
                            </div>
                        )}

                        {/* Notes Section */}
                        <div>
                            <label style={{ ...LS, fontSize: '11px' }}>{t('ملاحظات الجرد')}</label>
                            <input 
                                type="text" 
                                placeholder={t("أدخل أية ملاحظات إضافية حول هذه الجلسة...")} 
                                value={form.notes} 
                                onChange={e => setForm({ ...form, notes: e.target.value })} 
                                style={{ ...IS, fontSize: '12px', height: '42px' }} 
                                onFocus={focusIn} onBlur={focusOut} 
                            />
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: '16px', marginTop: '10px', borderTop: `1px solid ${C.border}`, paddingTop: '20px' }}>
                            <button type="submit" disabled={isSubmitting || !form.warehouseId} 
                                style={{ 
                                    ...BTN_PRIMARY(!form.warehouseId, isSubmitting), 
                                    height: '48px', 
                                    fontSize: '13px',
                                    background: !form.warehouseId ? 'rgba(255,255,255,0.05)' : (form.status === 'applied' ? 'linear-gradient(135deg,#059669, #10b981)' : 'linear-gradient(135deg,#d97706, #f59e0b)'),
                                    boxShadow: !form.warehouseId ? 'none' : (form.status === 'applied' ? '0 8px 24px rgba(16,185,129,0.2)' : '0 8px 24px rgba(245,158,11,0.2)')
                                }}>
                                {isSubmitting ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                        {form.status === 'applied' ? <CheckCircle2 size={18} /> : <FileText size={18} />}
                                        {form.status === 'applied' ? t('تسوية الأرصدة واحتساب الجرد') : t('حفظ جلسة الجرد كمسودة')}
                                    </div>
                                )}
                            </button>
                            <button type="button" onClick={printStocktaking} disabled={!form.warehouseId || lines.length === 0}
                                style={{ 
                                    borderRadius: '14px', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.03)', 
                                    color: 'rgba(255,255,255,0.6)', fontWeight: 700, cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    transition: '0.2s', height: '48px'
                                }}
                                onMouseEnter={e => { if(!e.currentTarget.disabled) { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; } }}
                                onMouseLeave={e => { if(!e.currentTarget.disabled) { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; } }}
                            >
                                <Printer size={16} /> {t('طباعة الجرد')}
                            </button>
                        </div>
                    </form>
                </div>

            </div>
            <style jsx global>{` @keyframes spin { to { transform:rotate(360deg); } } `}</style>
        </DashboardLayout>
    );
}
