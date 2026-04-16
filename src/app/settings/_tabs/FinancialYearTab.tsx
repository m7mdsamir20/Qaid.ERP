'use client';

import { C, CAIRO } from '@/constants/theme';
import {
    CalendarDays, Calendar, CalendarCheck, Clock, AlertCircle, Lock as LockIcon, Loader2
} from 'lucide-react';
import { TabHeader } from './shared';
import { useTranslation } from '@/lib/i18n';

interface FinancialYearTabProps {
    financialYears: any[];
    isSaving: boolean;
    saveSettings: (a: string, d: any) => any;
    setConfirmDelete: (v: any) => void;
}

export default function FinancialYearTab({ financialYears, isSaving, saveSettings, setConfirmDelete }: FinancialYearTabProps) {
    const { t } = useTranslation();
    const activeFY = financialYears.find(y => y.isOpen);
    const closedYears = financialYears.filter(y => !y.isOpen)
        .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    const calcDays = (s: any, e: any) =>
        Math.max(0, Math.ceil((new Date(e).getTime() - new Date(s).getTime()) / 86400000) + 1);
    const fmt = (d: any) => new Date(d).toLocaleDateString('en-GB');

    const getNextStart = () => {
        const base = activeFY || closedYears[0];
        if (base) {
            const d = new Date(base.endDate);
            d.setDate(d.getDate() + 1);
            return d;
        }
        return new Date(`${new Date().getFullYear()}-01-01`);
    };

    const nextStart = getNextStart();
    const nextStartStr = nextStart.toISOString().split('T')[0];

    const elapsed = activeFY ? calcDays(activeFY.startDate, new Date()) : 0;
    const total = activeFY ? calcDays(activeFY.startDate, activeFY.endDate) : 1;
    const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
    const remaining = activeFY ? Math.max(0, total - elapsed) : 0;

    const R = 54;
    const CIRC = 2 * Math.PI * R;

    return (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '32px', boxShadow: '0 10px 40px -15px rgba(0,0,0,0.5)', minHeight: '600px' }}>
            <div>
                <TabHeader title={t("السنة المالية")} sub={t("إدارة الفترات المالية وتسلسلها")} hideEditBtn />

                {/* ── لو مفيش سنة مالية ── */}
                {!activeFY && closedYears.length === 0 && (
                    <div style={{ background: 'rgba(59,130,246,0.04)', border: `1px solid ${C.primary}30`, borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: `${C.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary, margin: '0 auto 16px' }}>
                            <CalendarDays size={32} />
                        </div>
                        <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>{t('تأسيس الدورة المحاسبية')}</h3>
                        <p style={{ margin: '0 0 24px', fontSize: '13px', color: C.textMuted, maxWidth: '440px', marginInline: 'auto', fontFamily: CAIRO, lineHeight: 1.6 }}>{t('يجب عليك تحديد تواريخ السنة المالية الأولى للبدء في استخدام النظام وتسجيل القيود المحاسبية.')}</p>

                        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '24px' }}>
                            <div style={{ textAlign: 'start' }}>
                                <label style={{ display: 'block', fontSize: '11px', color: C.textSecondary, marginBottom: '6px', fontFamily: CAIRO, fontWeight: 700 }}>{t('تاريخ البداية')}</label>
                                <input id="fys" type="date" defaultValue={`${new Date().getFullYear()}-01-01`}
                                    style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: `1px solid ${C.border}`, background: 'rgba(0,0,0,0.2)', color: C.textPrimary, fontSize: '13px', outline: 'none', colorScheme: 'dark' }} />
                            </div>
                            <div style={{ textAlign: 'start' }}>
                                <label style={{ display: 'block', fontSize: '11px', color: C.textSecondary, marginBottom: '6px', fontFamily: CAIRO, fontWeight: 700 }}>{t('تاريخ النهاية')}</label>
                                <input id="fye" type="date" defaultValue={`${new Date().getFullYear()}-12-31`}
                                    style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: `1px solid ${C.border}`, background: 'rgba(0,0,0,0.2)', color: C.textPrimary, fontSize: '13px', outline: 'none', colorScheme: 'dark' }} />
                            </div>
                        </div>

                        <button onClick={() => {
                            const s = (document.getElementById('fys') as HTMLInputElement)?.value;
                            const e = (document.getElementById('fye') as HTMLInputElement)?.value;
                            if (!s || !e) { alert(t('حدد التواريخ')); return; }
                            if (new Date(e) <= new Date(s)) { alert(t('النهاية يجب أن تكون بعد البداية')); return; }
                            saveSettings('create_first_financial_year', { startDate: s, endDate: e });
                        }} disabled={isSaving}
                            style={{ height: '42px', padding: '0 28px', borderRadius: '10px', border: 'none', background: `linear-gradient(135deg, ${C.primary}, #2563eb)`, color: '#fff', fontSize: '14px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', margin: '0 auto', boxShadow: `0 8px 20px -6px ${C.primary}40`, fontFamily: CAIRO }}>
                            {isSaving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CalendarCheck size={16} />}
                            {t('تأسيس السنة المالية')}
                        </button>
                    </div>
                )}

                {/* ── السنة النشطة ── */}
                {activeFY && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '32px', display: 'flex', alignItems: 'center', gap: '40px', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)' }}>
                            {/* Circle Progress */}
                            <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                                <svg width="120" height="120" viewBox="0 0 128 128" style={{ transform: 'rotate(-90deg)' }}>
                                    <circle cx="64" cy="64" r="54" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="10" />
                                    <circle cx="64" cy="64" r="54" fill="none"
                                        stroke={pct > 90 ? C.danger : pct > 70 ? '#f59e0b' : C.primary}
                                        strokeWidth="10" strokeLinecap="round"
                                        strokeDasharray={CIRC} strokeDashoffset={CIRC - (pct / 100) * CIRC}
                                        style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                                </svg>
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ fontSize: '22px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>{Math.round(pct)}%</span>
                                    <span style={{ fontSize: '10px', color: C.textMuted, fontWeight: 800, fontFamily: CAIRO, textTransform: 'uppercase' }}>{t('مكتمل')}</span>
                                </div>
                            </div>

                            {/* Info details */}
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>{activeFY.name}</h3>
                                    <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '4px 12px', borderRadius: '20px', fontSize: '10px', fontWeight: 900, border: '1px solid rgba(16,185,129,0.2)', fontFamily: CAIRO }}>{t('دورة نشطة')}</span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                    {[
                                        { label: t('تاريخ البداية'), value: fmt(activeFY.startDate), icon: Calendar },
                                        { label: t('تاريخ الاستحقاق'), value: fmt(activeFY.endDate), icon: CalendarCheck },
                                        { label: t('الأيام المتبقية'), value: `${remaining} ${t('يوم')}`, icon: Clock, highlight: true }
                                    ].map((item, i) => (
                                        <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: C.textSecondary, marginBottom: '6px' }}>
                                                <item.icon size={12} />
                                                <span style={{ fontSize: '10px', fontWeight: 800, fontFamily: CAIRO }}>{item.label}</span>
                                            </div>
                                            <div style={{ fontSize: '13px', fontWeight: 900, color: item.highlight ? (remaining < 30 ? C.danger : C.primary) : C.textPrimary, direction: 'ltr', textAlign: 'start', fontFamily: 'monospace' }}>{item.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Actions Card */}
                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '24px', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                <div>
                                    <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>{t('إغلاق السنة المالية')}</h4>
                                    <p style={{ margin: 0, fontSize: '12px', color: C.textMuted, fontFamily: CAIRO, lineHeight: 1.5 }}>{t('عند إغلاق السنة، سيتم ترحيل الأرصدة الافتتاحية وفتح فترة جديدة تبدأ من')} <span style={{ color: C.primary, fontWeight: 900 }}>{fmt(nextStart)}</span></p>
                                </div>
                                <div style={{ background: `${C.danger}15`, color: C.danger, padding: '6px 14px', borderRadius: '10px', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', border: `1px solid ${C.danger}30`, fontFamily: CAIRO }}>
                                    <AlertCircle size={14} /> {t('إجراء حساس')}
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '12px', color: C.textSecondary, marginBottom: '8px', fontFamily: CAIRO, fontWeight: 800 }}>{t('تحديد تاريخ نهاية السنة الجديدة')}</label>
                                    <input id="closeEnd" type="date" min={nextStartStr}
                                        defaultValue={(() => {
                                            const d = new Date(nextStart);
                                            d.setFullYear(d.getFullYear() + 1);
                                            d.setDate(d.getDate() - 1);
                                            return d.toISOString().split('T')[0];
                                        })()}
                                        style={{ width: '100%', height: '42px', padding: '0 16px', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'rgba(0,0,0,0.2)', color: C.textPrimary, fontSize: '14px', fontWeight: 700, outline: 'none', boxSizing: 'border-box', colorScheme: 'dark', fontFamily: 'monospace' }} />
                                </div>
                                <button onClick={() => {
                                    const newEnd = (document.getElementById('closeEnd') as HTMLInputElement)?.value;
                                    setConfirmDelete({ type: 'closeYear', id: activeFY.id, name: activeFY.name });
                                }} disabled={isSaving}
                                    style={{ height: '42px', padding: '0 24px', borderRadius: '12px', border: 'none', background: C.danger, color: '#fff', fontSize: '13px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: `0 8px 16px -4px ${C.danger}40`, fontFamily: CAIRO }}>
                                    {isSaving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <LockIcon size={16} />}
                                    {t('إغلاق السنة وفتح فترة جديدة')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── الفترات المقفلة (Archive) ── */}
                {closedYears.length > 0 && (
                    <div style={{ marginTop: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <LockIcon size={14} style={{ color: C.textMuted }} />
                            <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 900, color: C.textSecondary, fontFamily: CAIRO, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('الأرشيف الضريبي (الفترات المقفلة)')}</h3>
                        </div>

                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', direction: 'inherit' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `2px solid ${C.border}` }}>
                                        {[t('اسم السنة'), t('من'), t('إلى'), t('إجمالي الأيام'), t('الحالة')].map(h => (
                                            <th key={h} style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 900, color: C.textMuted, textAlign: 'start', fontFamily: CAIRO }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {closedYears.map((fy, i) => (
                                        <tr key={fy.id} style={{ borderBottom: i < closedYears.length - 1 ? `1px solid ${C.border}` : 'none', transition: 'background 0.2s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '14px 20px', fontWeight: 800, color: C.textPrimary, fontSize: '13px', fontFamily: CAIRO }}>{fy.name}</td>
                                            <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontSize: '12px', color: C.textSecondary }}>{fmt(fy.startDate)}</td>
                                            <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontSize: '12px', color: C.textSecondary }}>{fmt(fy.endDate)}</td>
                                            <td style={{ padding: '14px 20px', fontSize: '12px', color: C.textMuted, fontFamily: CAIRO }}>{calcDays(fy.startDate, fy.endDate)} {t('يوم')}</td>
                                            <td style={{ padding: '14px 20px' }}>
                                                <span style={{ fontSize: '10px', background: 'rgba(100,116,139,0.1)', color: '#94a3b8', padding: '4px 12px', borderRadius: '20px', fontWeight: 900, border: '1px solid rgba(100,116,139,0.2)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: CAIRO }}>
                                                    <LockIcon size={12} /> {t('مقفلة')}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                <style jsx global>{`
                    input:-webkit-autofill,
                    input:-webkit-autofill:hover,
                    input:-webkit-autofill:focus,
                    input:-webkit-autofill:active {
                        -webkit-box-shadow: 0 0 0 1000px #0e172a inset !important;
                        -webkit-text-fill-color: #f8fafc !important;
                        caret-color: #f8fafc !important;
                        border-color: rgba(255,255,255,0.08) !important;
                        transition: background-color 5000s ease-in-out 0s !important;
                    }
                    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                `}</style>
            </div>
        </div>
    );
}
