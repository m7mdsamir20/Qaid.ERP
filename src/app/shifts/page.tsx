'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import Currency from '@/components/Currency';
import { C, CAIRO, OUTFIT, IS, LS, PAGE_BASE, TABLE_STYLE, BTN_PRIMARY } from '@/constants/theme';
import { Clock, Plus, Loader2, X, Check, AlertCircle, RefreshCw, TrendingUp, Package, DollarSign, Printer } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';

const STATUS_COLOR: Record<string, { color: string; bg: string; label: string }> = {
    open:   { color: '#10b981', bg: '#10b98112', label: 'مفتوحة' },
    closed: { color: '#6b7280', bg: '#6b728012', label: 'مغلقة' },
};

export default function ShiftsPage() {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'ar';
    const { fMoney } = useCurrency();

    const [shifts, setShifts]       = useState<any[]>([]);
    const [loading, setLoading]     = useState(true);
    const [showOpen, setShowOpen]   = useState(false);
    const [showClose, setShowClose] = useState<any>(null);
    const [saving, setSaving]       = useState(false);
    const [error, setError]         = useState('');
    const [openForm,  setOpenForm]  = useState({ openingBalance: '', notes: '' });
    const [closeForm, setCloseForm] = useState({ closingBalance: '', notes: '' });

    const load = useCallback(async () => {
        setLoading(true);
        try { const r = await fetch('/api/restaurant/shifts'); setShifts(await r.json()); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const activeShift = shifts.find(s => s.status === 'open');
    const formatDate  = (d: string) => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace('am', 'ص').replace('pm', 'م').replace('AM', 'ص').replace('PM', 'م');
    const arNum = (num: number | string) => num.toString();

    const handleOpen = async () => {
        setSaving(true); setError('');
        const res = await fetch('/api/restaurant/shifts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ openingBalance: Number(openForm.openingBalance) || 0, notes: openForm.notes }) });
        if (!res.ok) { const d = await res.json(); setError(d.error); } else { setShowOpen(false); setOpenForm({ openingBalance: '', notes: '' }); load(); }
        setSaving(false);
    };

    const handleClose = async () => {
        setSaving(true); setError('');
        const res = await fetch('/api/restaurant/shifts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: showClose.id, openingBalance: showClose.openingBalance, closingBalance: Number(closeForm.closingBalance) || 0, notes: closeForm.notes }) });
        if (!res.ok) { const d = await res.json(); setError(d.error); } else { setShowClose(null); setCloseForm({ closingBalance: '', notes: '' }); load(); }
        setSaving(false);
    };

    const printShiftReport = (shift: any) => {
        if (!shift) return;
        const html = `
            <html dir="${isRtl ? 'rtl' : 'ltr'}">
            <head>
                <style>
                    @page { margin: 0; }
                    body { font-family: 'Cairo', sans-serif; width: 280px; margin: 0 auto; padding: 20px 0; font-size: 13px; color: #000; }
                    .text-center { text-align: center; }
                    .dashed-line { border-top: 1px dashed #000; margin: 10px 0; }
                    .flex-between { display: flex; justify-content: space-between; margin-bottom: 5px; }
                    h2 { margin: 0 0 10px 0; font-size: 18px; }
                    .bold { font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="text-center">
                    <h2>تقرير الوردية #${arNum(shift.shiftNumber)}</h2>
                    <p>الكاشير: ${shift.user?.name || shift.user?.username || '—'}</p>
                    <p>وقت الفتح: ${formatDate(shift.openedAt)}</p>
                    ${shift.closedAt ? `<p>وقت الإغلاق: ${formatDate(shift.closedAt)}</p>` : ''}
                </div>
                <div class="dashed-line"></div>
                <div class="flex-between"><span>عهدة الفتح:</span> <span class="bold">${fMoney(shift.openingBalance)}</span></div>
                <div class="flex-between"><span>إجمالي المبيعات:</span> <span class="bold">${fMoney(shift.totalSales)}</span></div>
                <div class="flex-between"><span>المرتجعات:</span> <span class="bold">${fMoney(0)}</span></div>
                <div class="flex-between"><span>إجمالي الطلبات:</span> <span class="bold">${arNum(shift.totalOrders)}</span></div>
                <div class="dashed-line"></div>
                <div class="flex-between"><span>المتوقع في الدرج:</span> <span class="bold">${fMoney(shift.openingBalance + shift.totalSales)}</span></div>
                ${shift.closedAt ? `
                <div class="flex-between"><span>الفعلي في الدرج:</span> <span class="bold">${fMoney(shift.closingBalance)}</span></div>
                <div class="flex-between"><span>الفرق (عجز/زيادة):</span> <span class="bold">${fMoney(shift.difference)}</span></div>
                ` : ''}
                <div class="dashed-line"></div>
                <div class="text-center" style="margin-top: 20px; font-size: 11px;">
                    <p>تمت الطباعة: ${formatDate(new Date().toISOString())}</p>
                </div>
            </body>
            </html>
        `;

        if (typeof window !== 'undefined' && (window as any).electronAPI) {
            (window as any).electronAPI.silentPrint({ html: html });
            return;
        }

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '-10000px';
        iframe.style.bottom = '-10000px';
        document.body.appendChild(iframe);
        iframe.contentDocument?.open();
        iframe.contentDocument?.write(html);
        iframe.contentDocument?.close();
        setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => document.body.removeChild(iframe), 1000);
        }, 500);
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '60px', background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>
                <PageHeader
                    title={t('الورديات')}
                    subtitle={t('إدارة ورديات الكاشير وتسوية العهدة')}
                    icon={Clock}
                    actions={[
                        !activeShift
                            ? <button key="open" onClick={() => { setError(''); setShowOpen(true); }} style={{ height: '42px', padding: '0 20px', borderRadius: '10px', background: C.primary, color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontFamily: CAIRO, whiteSpace: 'nowrap' }}><Plus size={15} /> {t('فتح وردية')}</button>
                            : <button key="close" onClick={() => { setError(''); setShowClose(activeShift); setCloseForm({ closingBalance: '', notes: '' }); }} style={{ height: '42px', padding: '0 20px', borderRadius: '10px', border: '1px solid #ef444440', background: '#ef444412', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: '13px', fontFamily: CAIRO, whiteSpace: 'nowrap' }}>{t('إغلاق الوردية')}</button>
                    ]}
                />

                {/* الوردية المفتوحة */}
                {activeShift && (
                    <div style={{ background: '#10b98110', border: '2px solid #10b98140', borderRadius: '16px', padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 3px #10b98130' }} />
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', fontFamily: CAIRO }}>وردية #{arNum(activeShift.shiftNumber)} — مفتوحة</span>
                        </div>
                        {[{ label: 'عهدة الفتح', value: activeShift.openingBalance, isMoney: true, icon: DollarSign }, { label: 'مبيعات', value: activeShift.totalSales, isMoney: true, icon: TrendingUp }, { label: 'طلبات', value: arNum(activeShift.totalOrders), isMoney: false, icon: Package }].map(s => {
                            const Icon = s.icon;
                            return (
                                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Icon size={13} color={C.textMuted} />
                                    <span style={{ fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO }}>{s.label}:</span>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: C.textPrimary, fontFamily: OUTFIT }}>
                                        {s.isMoney ? <Currency amount={s.value as number} /> : s.value}
                                    </span>
                                </div>
                            );
                        })}
                        <span style={{ fontSize: '12px', color: C.textMuted, marginInlineStart: 'auto', fontFamily: CAIRO }}>فُتحت: {formatDate(activeShift.openedAt)}</span>
                        <button onClick={() => printShiftReport(activeShift)} style={{ height: '36px', padding: '0 16px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontFamily: CAIRO, fontWeight: 700 }}>
                            <Printer size={14} /> طباعة
                        </button>
                    </div>
                )}

                {/* الجدول */}
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: C.textMuted }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>
                ) : (
                    <div style={TABLE_STYLE.container}>
                        <table style={TABLE_STYLE.table}>
                            <thead style={TABLE_STYLE.thead}>
                                <tr>{['#', 'الكاشير', 'وقت الفتح', 'وقت الإغلاق', 'عهدة الفتح', 'مبيعات', 'طلبات', 'الفرق', 'الحالة'].map(h => (
                                    <th key={h} style={TABLE_STYLE.th(false)}>{h}</th>
                                ))}</tr>
                            </thead>
                            <tbody>
                                {shifts.length === 0 ? (
                                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: '48px', color: C.textMuted, fontFamily: CAIRO }}>
                                        <Clock size={36} style={{ opacity: 0.2, display: 'block', margin: '0 auto 10px' }} />لا توجد ورديات بعد
                                    </td></tr>
                                ) : shifts.map((shift, i) => {
                                    const st = STATUS_COLOR[shift.status] ?? STATUS_COLOR.closed;
                                    const diff = shift.difference;
                                    return (
                                        <tr key={shift.id} style={TABLE_STYLE.row(i === shifts.length - 1)} onMouseEnter={e => e.currentTarget.style.background = C.hover} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={TABLE_STYLE.td(false)}><span style={{ fontWeight: 700, fontFamily: OUTFIT, color: C.primary }}>#{arNum(shift.shiftNumber)}</span></td>
                                            <td style={{ ...TABLE_STYLE.td(false), fontSize: '12px', color: C.textSecondary }}>{shift.user?.name || shift.user?.username || '—'}</td>
                                            <td style={{ ...TABLE_STYLE.td(false), color: C.textSecondary, fontSize: '12px' }}>{formatDate(shift.openedAt)}</td>
                                            <td style={{ ...TABLE_STYLE.td(false), color: C.textSecondary, fontSize: '12px' }}>{shift.closedAt ? formatDate(shift.closedAt) : '—'}</td>
                                            <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT }}><Currency amount={shift.openingBalance} /></td>
                                            <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT }}><Currency amount={shift.totalSales} /></td>
                                            <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT }}>{arNum(shift.totalOrders)}</td>
                                            <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, fontWeight: 700, color: diff == null ? C.textMuted : diff >= 0 ? '#10b981' : '#ef4444' }}>
                                                {diff == null ? '—' : (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'inherit' }}>
                                                        {diff > 0 && '+'}
                                                        <Currency amount={diff} />
                                                    </span>
                                                )}
                                            </td>
                                            <td style={TABLE_STYLE.td(false)}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ background: st.bg, border: `1px solid ${st.color}40`, borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: 700, color: st.color }}>{st.label}</span>
                                                    <button onClick={() => printShiftReport(shift)} style={{ background: 'transparent', border: 'none', color: C.textMuted, cursor: 'pointer', padding: '4px' }} title="طباعة تقرير الوردية">
                                                        <Printer size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal فتح وردية */}
            <AppModal show={showOpen} onClose={() => setShowOpen(false)} title="فتح وردية جديدة" maxWidth="520px">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div><label style={LS}>عهدة الفتح</label><input type="number" min="0" value={openForm.openingBalance} onChange={e => setOpenForm(f => ({ ...f, openingBalance: e.target.value }))} placeholder="0" style={{ ...IS, fontFamily: OUTFIT }} /></div>
                    <div><label style={LS}>ملاحظات</label><input value={openForm.notes} onChange={e => setOpenForm(f => ({ ...f, notes: e.target.value }))} style={IS} /></div>
                    {error && <div style={{ background: C.dangerBg, border: `1px solid ${C.dangerBorder}`, borderRadius: '10px', padding: '10px 14px', color: C.danger, fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={14} />{error}</div>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', marginTop: '28px' }}>
                    <button onClick={handleOpen} disabled={saving} style={{ height: '44px', borderRadius: '10px', background: C.primary, color: '#fff', border: 'none', fontWeight: 600, fontSize: '13px', fontFamily: CAIRO, cursor: saving ? 'not-allowed' : 'pointer' }}>
                        {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : 'فتح الوردية'}
                    </button>
                    <button onClick={() => setShowOpen(false)} style={{ height: '44px', borderRadius: '10px', background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO, cursor: 'pointer' }}>إلغاء</button>
                </div>
            </AppModal>

            {/* Modal إغلاق وردية */}
            <AppModal show={!!showClose} onClose={() => setShowClose(null)} title={`إغلاق الوردية #${showClose?.shiftNumber}`} maxWidth="520px">
                <div style={{ background: `${C.primary}08`, border: `1px solid ${C.primary}20`, borderRadius: '10px', padding: '12px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {showClose && [{ label: 'عهدة الفتح', value: showClose.openingBalance }, { label: 'إجمالي المبيعات', value: showClose.totalSales }, { label: 'المتوقع في الدرج', value: showClose.openingBalance + showClose.totalSales }].map(r => (
                        <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                            <span style={{ color: C.textSecondary, fontFamily: CAIRO }}>{r.label}</span>
                            <span style={{ fontFamily: OUTFIT, fontWeight: 700, color: C.textPrimary }}>
                                <Currency amount={r.value} />
                            </span>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div><label style={LS}>المبلغ الفعلي في الدرج <span style={{ color: C.danger }}>*</span></label><input type="number" min="0" value={closeForm.closingBalance} onChange={e => setCloseForm(f => ({ ...f, closingBalance: e.target.value }))} placeholder="0.00" style={{ ...IS, fontFamily: OUTFIT }} /></div>
                    <div><label style={LS}>ملاحظات</label><input value={closeForm.notes} onChange={e => setCloseForm(f => ({ ...f, notes: e.target.value }))} style={IS} /></div>
                    {error && <div style={{ background: C.dangerBg, border: `1px solid ${C.dangerBorder}`, borderRadius: '10px', padding: '10px 14px', color: C.danger, fontSize: '12.5px', fontWeight: 600, display: 'flex', gap: '8px', alignItems: 'center' }}><AlertCircle size={14} />{error}</div>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', marginTop: '28px' }}>
                    <button onClick={handleClose} disabled={saving} style={{ height: '44px', borderRadius: '10px', background: C.danger, color: '#fff', border: 'none', fontWeight: 600, fontSize: '13px', fontFamily: CAIRO, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <>إغلاق وتسوية</>}
                    </button>
                    <button onClick={() => setShowClose(null)} style={{ height: '44px', borderRadius: '10px', background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO, cursor: 'pointer' }}>إلغاء</button>
                </div>
            </AppModal>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </DashboardLayout>
    );
}
