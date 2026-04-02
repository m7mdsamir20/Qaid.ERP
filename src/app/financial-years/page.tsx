'use client';

import DashboardLayout from '@/components/DashboardLayout';
import AppModal from '@/components/AppModal';
import PageHeader from '@/components/PageHeader';
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
    C, CAIRO, PAGE_BASE, TABLE_STYLE, KPI_STYLE, BTN_PRIMARY
} from '@/constants/theme';
import {
    CalendarDays, CalendarCheck, Clock, Calendar, Lock as LockIcon,
    AlertCircle, Loader2, Check, TrendingUp, TrendingDown,
    BookOpen, Receipt, Pencil, X
} from 'lucide-react';

/* ── helpers ── */
// ar-EG-u-nu-latn = Arabic month names + Latin (English) digits
const fmt = (d: any) =>
    new Date(d).toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'short', day: '2-digit' });

const calcDays = (s: any, e: any) =>
    Math.max(0, Math.ceil((new Date(e).getTime() - new Date(s).getTime()) / 86400000) + 1);

const fmtMoney = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const CURRENCY_AR: Record<string, string> = {
    EGP: 'ج.م', SAR: 'ر.س', AED: 'د.إ', KWD: 'د.ك',
    QAR: 'ر.ق', BHD: 'د.ب', OMR: 'ر.ع', JOD: 'د.أ',
    LYD: 'د.ل', IQD: 'د.ع', TRY: '₺', USD: '$', EUR: '€', GBP: '£'
};

/* ── KPI card matching system design ── */
function KpiCard({ icon: Icon, label, value, sub, color }: any) {
    return (
        <div style={KPI_STYLE(color)}>
            <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: `${color}20`, display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0
            }}>
                <Icon size={18} color={color} />
            </div>
            <div>
                <div style={{ fontSize: '10px', color: C.textMuted, fontWeight: 700, fontFamily: CAIRO, marginBottom: '2px' }}>{label}</div>
                <div style={{ fontSize: '16px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>{value}</div>
                {sub && <div style={{ fontSize: '10px', color: C.textMuted, fontFamily: CAIRO, marginTop: '1px' }}>{sub}</div>}
            </div>
        </div>
    );
}

export default function FinancialYearsPage() {
    const { data: session } = useSession();
    const currency = (session?.user as any)?.currency || 'EGP';

    const [years, setYears] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [confirmClose, setConfirmClose] = useState<any>(null);
    const [isClosing, setIsClosing] = useState(false);
    const [createForm, setCreateForm] = useState({
        startDate: `${new Date().getFullYear()}-01-01`,
        endDate: `${new Date().getFullYear()}-12-31`,
    });
    const [editingName, setEditingName] = useState<{ id: string; name: string } | null>(null);
    const closeEndRef = useRef<HTMLInputElement>(null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchYears = async () => {
        try {
            const res = await fetch('/api/financial-years', { cache: 'no-store' });
            if (res.ok) setYears(await res.json());
        } catch { }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchYears(); }, []);

    const callApi = async (action: string, data: any) => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/financial-years', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, data })
            });
            if (res.ok) {
                showToast('تم الحفظ بنجاح ✓');
                await fetchYears();
                return true;
            } else {
                const e = await res.json();
                showToast(e.error || 'فشل الحفظ', 'error');
                return false;
            }
        } finally { setIsSaving(false); }
    };

    const activeFY = years.find(y => y.isOpen);
    const closedYears = years
        .filter(y => !y.isOpen)
        .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    const nextStart = (() => {
        const base = activeFY || closedYears[0];
        if (base) {
            const d = new Date(base.endDate);
            d.setDate(d.getDate() + 1);
            return d;
        }
        return new Date(`${new Date().getFullYear()}-01-01`);
    })();

    const nextStartStr = nextStart.toISOString().split('T')[0];
    const defaultCloseEnd = (() => {
        const d = new Date(nextStart);
        d.setFullYear(d.getFullYear() + 1);
        d.setDate(d.getDate() - 1);
        return d.toISOString().split('T')[0];
    })();

    const elapsed = activeFY ? calcDays(activeFY.startDate, new Date()) : 0;
    const total = activeFY ? calcDays(activeFY.startDate, activeFY.endDate) : 1;
    const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
    const remaining = activeFY ? Math.max(0, total - elapsed) : 0;
    const R = 54, CIRC = 2 * Math.PI * R;

    // نفس تصميم حقل التاريخ في باقي صفحات النظام
    const IS: React.CSSProperties = {
        background: C.inputBg, border: `1px solid ${C.border}`,
        borderRadius: '10px', padding: '0 14px', height: '40px',
        color: C.textPrimary, fontSize: '13px', outline: 'none',
        colorScheme: 'dark' as any, fontFamily: CAIRO,
        direction: 'ltr', textAlign: 'left'
    };

    return (
        <DashboardLayout>
            <div dir="rtl" style={PAGE_BASE}>

                {/* Toast */}
                {toast && (
                    <div style={{
                        position: 'fixed', bottom: '24px', left: '24px',
                        background: toast.type === 'success' ? '#10b981' : '#ef4444',
                        color: '#fff', padding: '12px 24px', borderRadius: '10px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.2)', display: 'flex',
                        alignItems: 'center', gap: '10px', zIndex: 9999,
                        fontSize: '14px', fontWeight: 600, fontFamily: CAIRO
                    }}>
                        {toast.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />} {toast.msg}
                    </div>
                )}

                <PageHeader
                    title="السنة المالية"
                    subtitle="إدارة الدورات المحاسبية وتتبع ملخص كل فترة مالية"
                    icon={CalendarDays}
                />

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px', color: C.primary }}>
                        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                        {/* ══ لا توجد سنة مالية ══ */}
                        {!activeFY && closedYears.length === 0 && (
                            <div style={{
                                background: `${C.primary}06`, border: `1px solid ${C.primary}25`,
                                borderRadius: '20px', padding: '48px', textAlign: 'center'
                            }}>
                                <div style={{
                                    width: '72px', height: '72px', borderRadius: '20px',
                                    background: `${C.primary}15`, display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', color: C.primary, margin: '0 auto 20px'
                                }}>
                                    <CalendarDays size={36} />
                                </div>
                                <h3 style={{ margin: '0 0 10px', fontSize: '20px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>
                                    تأسيس الدورة المحاسبية
                                </h3>
                                <p style={{ margin: '0 0 32px', fontSize: '13px', color: C.textMuted, maxWidth: '460px', marginInline: 'auto', fontFamily: CAIRO, lineHeight: 1.7 }}>
                                    حدد تواريخ السنة المالية الأولى للبدء في استخدام النظام وتسجيل القيود المحاسبية.
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '28px' }}>
                                    {[
                                        { label: 'تاريخ البداية', key: 'startDate' },
                                        { label: 'تاريخ النهاية', key: 'endDate' },
                                    ].map(f => (
                                        <div key={f.key} style={{ textAlign: 'right' }}>
                                            <label style={{ display: 'block', fontSize: '12px', color: C.textSecondary, marginBottom: '8px', fontFamily: CAIRO, fontWeight: 700 }}>{f.label}</label>
                                            <input type="date"
                                                value={(createForm as any)[f.key]}
                                                onChange={e => setCreateForm(p => ({ ...p, [f.key]: e.target.value }))}
                                                style={IS} />
                                        </div>
                                    ))}
                                </div>
                                <button onClick={async () => {
                                    if (!createForm.startDate || !createForm.endDate) { showToast('حدد التواريخ أولاً', 'error'); return; }
                                    if (new Date(createForm.endDate) <= new Date(createForm.startDate)) { showToast('تاريخ النهاية يجب أن يكون بعد البداية', 'error'); return; }
                                    await callApi('create_first', createForm);
                                }} disabled={isSaving}
                                    style={{ ...BTN_PRIMARY(false, isSaving), width: 'auto', height: '44px', padding: '0 32px', margin: '0 auto', fontSize: '14px' }}>
                                    {isSaving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CalendarCheck size={16} />}
                                    تأسيس السنة المالية
                                </button>
                            </div>
                        )}

                        {/* ══ السنة النشطة ══ */}
                        {activeFY && (
                            <div style={{
                                background: C.card, border: `1px solid ${C.border}`,
                                borderRadius: '20px', overflow: 'hidden',
                                boxShadow: '0 4px 24px -10px rgba(0,0,0,0.4)'
                            }}>
                                {/* Header strip */}
                                <div style={{
                                    background: `linear-gradient(135deg, ${C.primary}18, ${C.primary}08)`,
                                    borderBottom: `1px solid ${C.primary}20`,
                                    padding: '14px 28px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 3px rgba(16,185,129,0.2)' }} />
                                        {editingName?.id === activeFY.id ? (
                                            <form onSubmit={async (e) => {
                                                e.preventDefault();
                                                const name = editingName?.name?.trim();
                                                if (name) await callApi('rename', { id: activeFY.id, name });
                                                setEditingName(null);
                                            }} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <input autoFocus value={editingName?.name ?? ''}
                                                    onChange={e => setEditingName(p => p ? { ...p, name: e.target.value } : null)}
                                                    style={{ ...IS, height: '32px', width: '200px', fontSize: '14px', fontWeight: 900, fontFamily: CAIRO }} />
                                                <button type="submit" style={{ background: C.primary, border: 'none', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><Check size={12} /></button>
                                                <button type="button" onClick={() => setEditingName(null)} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.textMuted }}><X size={12} /></button>
                                            </form>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '15px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>{activeFY.name}</span>
                                                <button onClick={() => setEditingName({ id: activeFY.id, name: activeFY.name })}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: '2px 4px', display: 'flex', alignItems: 'center', borderRadius: '4px' }}>
                                                    <Pencil size={11} />
                                                </button>
                                            </div>
                                        )}
                                        <span style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', padding: '2px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 900, border: '1px solid rgba(16,185,129,0.2)', fontFamily: CAIRO }}>دورة نشطة</span>
                                    </div>
                                    <span style={{ fontSize: '12px', color: C.textMuted, fontFamily: CAIRO }}>
                                        {fmt(activeFY.startDate)} — {fmt(activeFY.endDate)}
                                    </span>
                                </div>

                                {/* Body */}
                                <div style={{ padding: '24px 28px', display: 'flex', gap: '32px', alignItems: 'center' }}>
                                    {/* Circle Progress */}
                                    <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
                                        <svg width="120" height="120" viewBox="0 0 128 128" style={{ transform: 'rotate(-90deg)' }}>
                                            <circle cx="64" cy="64" r={R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="10" />
                                            <circle cx="64" cy="64" r={R} fill="none"
                                                stroke={pct > 90 ? C.danger : pct > 70 ? '#f59e0b' : C.primary}
                                                strokeWidth="10" strokeLinecap="round"
                                                strokeDasharray={CIRC} strokeDashoffset={CIRC - (pct / 100) * CIRC}
                                                style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)' }} />
                                        </svg>
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                            <span style={{ fontSize: '22px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>{Math.round(pct)}%</span>
                                            <span style={{ fontSize: '9px', color: C.textMuted, fontWeight: 700, fontFamily: CAIRO }}>مكتمل</span>
                                        </div>
                                    </div>

                                    {/* KPI Cards */}
                                    <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                        <KpiCard icon={Calendar} label="تاريخ البداية" value={fmt(activeFY.startDate)} color={C.primary} />
                                        <KpiCard icon={CalendarCheck} label="تاريخ الانتهاء" value={fmt(activeFY.endDate)} color="#8b5cf6" />
                                        <KpiCard icon={Clock} label="الأيام المتبقية" value={`${remaining.toLocaleString('en-US')} يوم`} color={remaining < 30 ? C.danger : '#f59e0b'}
                                            sub={remaining < 30 ? 'تقترب نهاية السنة' : undefined} />
                                        {activeFY.stats && <>
                                            <KpiCard icon={TrendingUp} label="إجمالي المبيعات"
                                                value={`${fmtMoney(activeFY.stats.salesTotal)} ${CURRENCY_AR[currency] || currency}`} color="#10b981"
                                                sub={`${activeFY.stats.salesCount} فاتورة`} />
                                            <KpiCard icon={TrendingDown} label="إجمالي المشتريات"
                                                value={`${fmtMoney(activeFY.stats.purchasesTotal)} ${CURRENCY_AR[currency] || currency}`} color={C.danger}
                                                sub={`${activeFY.stats.purchasesCount} فاتورة`} />
                                            <KpiCard icon={BookOpen} label="قيود يومية" value={activeFY.stats.journalEntries.toLocaleString('en-US')} color="#f59e0b" />
                                        </>}
                                    </div>
                                </div>

                                {/* Close Section */}
                                <div style={{ margin: '0 28px 24px', background: `${C.danger}08`, border: `1px solid ${C.danger}20`, borderRadius: '12px', padding: '18px 22px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <LockIcon size={13} color={C.danger} />
                                                <span style={{ fontSize: '13px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>إغلاق السنة وفتح دورة جديدة</span>
                                                <span style={{ fontSize: '10px', color: C.danger, background: `${C.danger}15`, padding: '2px 8px', borderRadius: '6px', fontWeight: 800, fontFamily: CAIRO }}>إجراء حساس</span>
                                            </div>
                                            <p style={{ margin: 0, fontSize: '12px', color: C.textMuted, fontFamily: CAIRO, lineHeight: 1.6 }}>
                                                ستُجمَّد جميع العمليات وتُفتح فترة جديدة تبدأ من <span style={{ color: C.primary, fontWeight: 900, fontFamily: CAIRO }}>{fmt(nextStart)}</span>
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', flexShrink: 0 }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '10px', color: C.textSecondary, marginBottom: '5px', fontFamily: CAIRO, fontWeight: 700 }}>نهاية الفترة الجديدة</label>
                                                <input ref={closeEndRef} type="date" min={nextStartStr} defaultValue={defaultCloseEnd} style={IS} />
                                            </div>
                                            <button onClick={() => setConfirmClose({ id: activeFY.id, name: activeFY.name })} disabled={isSaving}
                                                style={{ height: '40px', padding: '0 20px', borderRadius: '10px', border: 'none', background: C.danger, color: '#fff', fontSize: '12px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: `0 6px 14px -4px ${C.danger}50`, fontFamily: CAIRO }}>
                                                <LockIcon size={13} /> إغلاق السنة
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ══ جدول الفترات المغلقة ══ */}
                        {closedYears.length > 0 && (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <LockIcon size={13} color={C.textMuted} />
                                    <h3 style={{ margin: 0, fontSize: '11px', fontWeight: 900, color: C.textSecondary, fontFamily: CAIRO, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        الفترات المالية المغلقة · {closedYears.length}
                                    </h3>
                                </div>

                                <div style={TABLE_STYLE.container}>
                                    <table style={TABLE_STYLE.table}>
                                        <thead>
                                            <tr style={TABLE_STYLE.thead}>
                                                <th style={TABLE_STYLE.th(true)}>السنة المالية</th>
                                                <th style={TABLE_STYLE.th(false)}>من</th>
                                                <th style={TABLE_STYLE.th(false)}>إلى</th>
                                                <th style={TABLE_STYLE.th(false)}>الأيام</th>
                                                <th style={TABLE_STYLE.th(false)}>المبيعات</th>
                                                <th style={TABLE_STYLE.th(false)}>المشتريات</th>
                                                <th style={TABLE_STYLE.th(false)}>صافي الفترة</th>
                                                <th style={TABLE_STYLE.th(false)}>قيود</th>
                                                <th style={TABLE_STYLE.th(false)}>الحالة</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {closedYears.map((fy, idx) => {
                                                const s = fy.stats;
                                                const profit = s ? s.salesTotal - s.purchasesTotal : 0;
                                                const isLast = idx === closedYears.length - 1;
                                                return (
                                                    <tr key={fy.id} style={TABLE_STYLE.row(isLast)}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.12)'}>
                                                        {/* الاسم */}
                                                        <td style={{ ...TABLE_STYLE.td(true) }}>
                                                            <div style={{ fontWeight: 800, color: C.textPrimary, fontSize: '13px', fontFamily: CAIRO }}>{fy.name}</div>
                                                        </td>
                                                        {/* من */}
                                                        <td style={{ ...TABLE_STYLE.td(false), fontFamily: CAIRO, fontSize: '12px', color: C.textSecondary }}>
                                                            {fmt(fy.startDate)}
                                                        </td>
                                                        {/* إلى */}
                                                        <td style={{ ...TABLE_STYLE.td(false), fontFamily: CAIRO, fontSize: '12px', color: C.textSecondary }}>
                                                            {fmt(fy.endDate)}
                                                        </td>
                                                        {/* الأيام */}
                                                        <td style={{ ...TABLE_STYLE.td(false), fontSize: '12px', color: C.textMuted }}>
                                                            {calcDays(fy.startDate, fy.endDate).toLocaleString('en-US')}
                                                        </td>
                                                        {/* المبيعات */}
                                                        <td style={{ ...TABLE_STYLE.td(false), fontFamily: CAIRO }}>
                                                            {s ? (
                                                                <div>
                                                                    <div style={{ fontWeight: 700, color: '#10b981', fontSize: '12px' }}>{fmtMoney(s.salesTotal)} {CURRENCY_AR[currency] || currency}</div>
                                                                    <div style={{ fontSize: '10px', color: C.textMuted }}>{s.salesCount} فاتورة</div>
                                                                </div>
                                                            ) : <span style={{ color: C.textMuted, fontSize: '11px' }}>—</span>}
                                                        </td>
                                                        {/* المشتريات */}
                                                        <td style={{ ...TABLE_STYLE.td(false), fontFamily: CAIRO }}>
                                                            {s ? (
                                                                <div>
                                                                    <div style={{ fontWeight: 700, color: C.danger, fontSize: '12px' }}>{fmtMoney(s.purchasesTotal)} {CURRENCY_AR[currency] || currency}</div>
                                                                    <div style={{ fontSize: '10px', color: C.textMuted }}>{s.purchasesCount} فاتورة</div>
                                                                </div>
                                                            ) : <span style={{ color: C.textMuted, fontSize: '11px' }}>—</span>}
                                                        </td>
                                                        {/* صافي */}
                                                        <td style={{ ...TABLE_STYLE.td(false), fontFamily: CAIRO }}>
                                                            {s ? (
                                                                <div>
                                                                    <div style={{ fontWeight: 800, color: profit >= 0 ? '#10b981' : C.danger, fontSize: '12px' }}>
                                                                        {profit >= 0 ? '+' : '-'}{fmtMoney(Math.abs(profit))} {CURRENCY_AR[currency] || currency}
                                                                    </div>
                                                                    <div style={{ fontSize: '10px', color: C.textMuted }}>{profit >= 0 ? 'ربح' : 'خسارة'}</div>
                                                                </div>
                                                            ) : <span style={{ color: C.textMuted, fontSize: '11px' }}>—</span>}
                                                        </td>
                                                        {/* قيود */}
                                                        <td style={{ ...TABLE_STYLE.td(false), fontFamily: CAIRO, fontSize: '12px', color: C.textSecondary }}>
                                                            {s ? s.journalEntries.toLocaleString('en-US') : '—'}
                                                        </td>
                                                        {/* الحالة */}
                                                        <td style={TABLE_STYLE.td(false)}>
                                                            <span style={{
                                                                fontSize: '10px', background: 'rgba(100,116,139,0.1)',
                                                                color: '#94a3b8', padding: '4px 10px', borderRadius: '16px',
                                                                fontWeight: 900, border: '1px solid rgba(100,116,139,0.15)',
                                                                display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: CAIRO
                                                            }}>
                                                                <LockIcon size={10} /> مغلقة
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                    </div>
                )}

                {/* Confirm Close Modal */}
                <AppModal
                    show={!!confirmClose}
                    onClose={() => !isClosing && setConfirmClose(null)}
                    isSubmitting={isClosing}
                    isDelete={true}
                    title="إغلاق السنة المالية"
                    description={`هل أنت متأكد من إغلاق "${confirmClose?.name}"؟ سيتم تجميد كافة العمليات في هذه الفترة وفتح سنة جديدة تلقائياً.`}
                    confirmText="نعم، أغلق السنة"
                    onConfirm={async () => {
                        setIsClosing(true);
                        const newEnd = closeEndRef.current?.value;
                        const ok = await callApi('close', { id: confirmClose.id, newEndDate: newEnd });
                        setIsClosing(false);
                        if (ok) setConfirmClose(null);
                    }}
                />

                <style jsx global>{`
                    @keyframes spin { to { transform: rotate(360deg); } }
                `}</style>
            </div>
        </DashboardLayout>
    );
}
