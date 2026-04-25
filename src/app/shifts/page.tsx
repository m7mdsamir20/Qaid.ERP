'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { C, CAIRO, OUTFIT, IS, LS, BTN_PRIMARY } from '@/constants/theme';
import { useCurrency } from '@/hooks/useCurrency';
import { Clock, Plus, Loader2, X, Check, AlertCircle, RefreshCw, ChevronDown, TrendingUp, Package, DollarSign } from 'lucide-react';

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
        try {
            const r = await fetch('/api/restaurant/shifts');
            setShifts(await r.json());
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const activeShift = shifts.find(s => s.status === 'open');

    const handleOpen = async () => {
        setSaving(true); setError('');
        const res = await fetch('/api/restaurant/shifts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ openingBalance: Number(openForm.openingBalance) || 0, notes: openForm.notes }),
        });
        if (!res.ok) { const d = await res.json(); setError(d.error); }
        else { setShowOpen(false); setOpenForm({ openingBalance: '', notes: '' }); load(); }
        setSaving(false);
    };

    const handleClose = async () => {
        setSaving(true); setError('');
        const res = await fetch('/api/restaurant/shifts', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: showClose.id,
                openingBalance: showClose.openingBalance,
                closingBalance: Number(closeForm.closingBalance) || 0,
                notes: closeForm.notes,
            }),
        });
        if (!res.ok) { const d = await res.json(); setError(d.error); }
        else { setShowClose(null); setCloseForm({ closingBalance: '', notes: '' }); load(); }
        setSaving(false);
    };

    const formatDate = (d: string) => new Date(d).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto', fontFamily: CAIRO }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Clock size={24} color={C.primary} /> {t('الورديات')}
                        </h1>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: C.textMuted }}>{t('إدارة ورديات الكاشير وتسوية العهدة')}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={load} style={{ height: '40px', width: '40px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw size={15} /></button>
                        {!activeShift ? (
                            <button onClick={() => { setError(''); setShowOpen(true); }} style={{ ...BTN_PRIMARY(false, false), height: '40px', padding: '0 20px', borderRadius: '10px', gap: '6px', fontSize: '13px' }}>
                                <Plus size={15} /> {t('فتح وردية')}
                            </button>
                        ) : (
                            <button onClick={() => { setError(''); setShowClose(activeShift); setCloseForm({ closingBalance: '', notes: '' }); }}
                                style={{ height: '40px', padding: '0 20px', borderRadius: '10px', border: '1px solid #ef444440', background: '#ef444412', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: '13px', fontFamily: CAIRO }}>
                                🔒 {t('إغلاق الوردية')}
                            </button>
                        )}
                    </div>
                </div>

                {/* الوردية المفتوحة حالياً */}
                {activeShift && (
                    <div style={{ background: '#10b98110', border: '2px solid #10b98140', borderRadius: '20px', padding: '20px 24px', marginBottom: '24px', display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 4px #10b98130', animation: 'pulse 2s infinite' }} />
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#10b981' }}>وردية #{activeShift.shiftNumber} — مفتوحة الآن</span>
                        </div>
                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                            {[
                                { label: 'عهدة الفتح', value: fMoney(activeShift.openingBalance), icon: DollarSign },
                                { label: 'إجمالي المبيعات', value: fMoney(activeShift.totalSales), icon: TrendingUp },
                                { label: 'عدد الطلبات', value: activeShift.totalOrders, icon: Package },
                            ].map(s => {
                                const Icon = s.icon;
                                return (
                                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Icon size={14} color={C.textMuted} />
                                        <span style={{ fontSize: '12px', color: C.textSecondary }}>{s.label}:</span>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: C.textPrimary, fontFamily: OUTFIT }}>{s.value}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <span style={{ fontSize: '12px', color: C.textMuted, marginInlineStart: 'auto' }}>فُتحت: {formatDate(activeShift.openedAt)}</span>
                    </div>
                )}

                {/* جدول الورديات */}
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: C.textMuted }}><Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} /></div>
                ) : (
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: CAIRO }}>
                            <thead>
                                <tr style={{ background: `${C.primary}08`, borderBottom: `1px solid ${C.border}` }}>
                                    {['#', 'وقت الفتح', 'وقت الإغلاق', 'عهدة الفتح', 'مبيعات', 'طلبات', 'فرق', 'الحالة'].map(h => (
                                        <th key={h} style={{ padding: '12px 16px', textAlign: 'start', fontWeight: 700, color: C.textSecondary, fontSize: '12px' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {shifts.length === 0 ? (
                                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: C.textMuted }}>
                                        <Clock size={40} style={{ opacity: 0.2, display: 'block', margin: '0 auto 12px' }} />
                                        لا توجد ورديات بعد
                                    </td></tr>
                                ) : shifts.map((shift, i) => {
                                    const st = STATUS_COLOR[shift.status] ?? STATUS_COLOR.closed;
                                    const diff = shift.difference;
                                    return (
                                        <tr key={shift.id} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = `${C.primary}05`}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '12px 16px', fontWeight: 700, fontFamily: OUTFIT, color: C.textPrimary }}>#{shift.shiftNumber}</td>
                                            <td style={{ padding: '12px 16px', color: C.textSecondary, fontSize: '12px' }}>{formatDate(shift.openedAt)}</td>
                                            <td style={{ padding: '12px 16px', color: C.textSecondary, fontSize: '12px' }}>{shift.closedAt ? formatDate(shift.closedAt) : '—'}</td>
                                            <td style={{ padding: '12px 16px', fontFamily: OUTFIT, color: C.textPrimary }}>{fMoney(shift.openingBalance)}</td>
                                            <td style={{ padding: '12px 16px', fontFamily: OUTFIT, color: C.textPrimary }}>{fMoney(shift.totalSales)}</td>
                                            <td style={{ padding: '12px 16px', fontFamily: OUTFIT, color: C.textPrimary }}>{shift.totalOrders}</td>
                                            <td style={{ padding: '12px 16px', fontFamily: OUTFIT, fontWeight: 700, color: diff == null ? C.textMuted : diff >= 0 ? '#10b981' : '#ef4444' }}>
                                                {diff == null ? '—' : (diff >= 0 ? '+' : '') + fMoney(diff)}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{ background: st.bg, border: `1px solid ${st.color}40`, borderRadius: '6px', padding: '3px 10px', fontSize: '11.5px', fontWeight: 700, color: st.color }}>{st.label}</span>
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
            {showOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '420px', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: C.textPrimary }}>فتح وردية جديدة</h2>
                            <button onClick={() => setShowOpen(false)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div><label style={LS}>عهدة الفتح (المبلغ في الدرج)</label><input type="number" min="0" value={openForm.openingBalance} onChange={e => setOpenForm(f => ({ ...f, openingBalance: e.target.value }))} placeholder="0" style={{ ...IS, fontFamily: OUTFIT }} /></div>
                            <div><label style={LS}>ملاحظات (اختياري)</label><input value={openForm.notes} onChange={e => setOpenForm(f => ({ ...f, notes: e.target.value }))} style={IS} /></div>
                            {error && <div style={{ background: C.dangerBg, border: `1px solid ${C.dangerBorder}`, borderRadius: '10px', padding: '10px 14px', color: C.danger, fontSize: '12.5px', display: 'flex', gap: '8px', alignItems: 'center' }}><AlertCircle size={14} />{error}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                            <button onClick={() => setShowOpen(false)} style={{ flex: 1, height: '46px', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO }}>إلغاء</button>
                            <button onClick={handleOpen} disabled={saving} style={{ ...BTN_PRIMARY(saving, false), flex: 2, height: '46px', borderRadius: '12px', gap: '8px' }}>
                                {saving ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> جاري الفتح...</> : <><Check size={15} /> فتح الوردية</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal إغلاق وردية */}
            {showClose && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '440px', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: C.textPrimary }}>إغلاق الوردية #{showClose.shiftNumber}</h2>
                            <button onClick={() => setShowClose(null)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <div style={{ background: `${C.primary}08`, border: `1px solid ${C.primary}20`, borderRadius: '12px', padding: '14px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                <span style={{ color: C.textSecondary }}>عهدة الفتح</span>
                                <span style={{ fontFamily: OUTFIT, fontWeight: 700, color: C.textPrimary }}>{fMoney(showClose.openingBalance)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                <span style={{ color: C.textSecondary }}>إجمالي المبيعات</span>
                                <span style={{ fontFamily: OUTFIT, fontWeight: 700, color: '#10b981' }}>{fMoney(showClose.totalSales)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderTop: `1px solid ${C.border}`, paddingTop: '8px' }}>
                                <span style={{ color: C.textSecondary }}>المبلغ المتوقع في الدرج</span>
                                <span style={{ fontFamily: OUTFIT, fontWeight: 700, color: C.textPrimary }}>{fMoney(showClose.openingBalance + showClose.totalSales)}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div><label style={LS}>المبلغ الفعلي في الدرج <span style={{ color: C.danger }}>*</span></label><input type="number" min="0" value={closeForm.closingBalance} onChange={e => setCloseForm(f => ({ ...f, closingBalance: e.target.value }))} placeholder="0.00" style={{ ...IS, fontFamily: OUTFIT }} /></div>
                            <div><label style={LS}>ملاحظات</label><input value={closeForm.notes} onChange={e => setCloseForm(f => ({ ...f, notes: e.target.value }))} style={IS} /></div>
                            {error && <div style={{ background: C.dangerBg, border: `1px solid ${C.dangerBorder}`, borderRadius: '10px', padding: '10px 14px', color: C.danger, fontSize: '12.5px', display: 'flex', gap: '8px', alignItems: 'center' }}><AlertCircle size={14} />{error}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                            <button onClick={() => setShowClose(null)} style={{ flex: 1, height: '46px', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO }}>إلغاء</button>
                            <button onClick={handleClose} disabled={saving} style={{ flex: 2, height: '46px', borderRadius: '12px', border: '1px solid #ef444440', background: '#ef444420', color: '#ef4444', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: CAIRO, opacity: saving ? 0.7 : 1 }}>
                                {saving ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> جاري الإغلاق...</> : <>🔒 إغلاق وتسوية</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
        </DashboardLayout>
    );
}
