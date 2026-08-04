'use client';
import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import CustomSelect from '@/components/CustomSelect';
import { useTranslation } from '@/lib/i18n';
import {
    Target, Plus, Loader2, Edit2, AlertCircle, Copy, TrendingUp, Users
} from 'lucide-react';
import {
    C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut,
    PAGE_BASE, BTN_PRIMARY, TABLE_STYLE
} from '@/constants/theme';
import StatCard, { StatCardGrid } from '@/components/StatCard';

interface SalesRep { id: string; name: string; code?: string; }
interface SalesTarget {
    id: string;
    salesRepId: string;
    salesRep?: SalesRep;
    year: number;
    month: number;
    targetAmount: number;
    targetCount?: number;
    achievedAmount?: number;
    achievedCount?: number;
    notes?: string;
}

const MONTHS_AR = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

function ProgressBar({ percent }: { percent: number }) {
    const color = percent >= 100 ? C.success : percent >= 70 ? C.warning : C.danger;
    return (
        <div style={{ width: '100%', height: '6px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: '6px' }}>
            <div style={{
                height: '100%', borderRadius: '4px', background: color,
                width: `${Math.min(percent, 100)}%`, transition: 'width 0.4s ease'
            }} />
        </div>
    );
}

const EMPTY_FORM = {
    salesRepId: '', year: '', month: '', targetAmount: '', targetCount: '', notes: ''
};

export default function TargetsPage() {
    const { t } = useTranslation();
    const now = new Date();

    const [targets, setTargets] = useState<SalesTarget[]>([]);
    const [reps, setReps] = useState<SalesRep[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCopying, setIsCopying] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<SalesTarget | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({ ...EMPTY_FORM });
    const [error, setError] = useState('');

    const [year, setYear] = useState(String(now.getFullYear()));
    const [month, setMonth] = useState(String(now.getMonth() + 1));

    const fetchTargets = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ year, month });
            const res = await fetch(`/api/sales-targets?${params}`);
            if (res.ok) setTargets(await res.json());
        } catch { } finally { setLoading(false); }
    }, [year, month]);

    useEffect(() => {
        fetchTargets();
        fetch('/api/sales-reps').then(r => r.ok ? r.json() : []).then(d => setReps(d.salesReps || d));
    }, []);

    useEffect(() => { fetchTargets(); }, [fetchTargets]);

    const openAdd = (rep?: SalesRep) => {
        setEditTarget(null);
        setFormData({
            ...EMPTY_FORM,
            salesRepId: rep?.id || '',
            year, month
        });
        setError('');
        setIsModalOpen(true);
    };

    const openEdit = (target: SalesTarget) => {
        setEditTarget(target);
        setFormData({
            salesRepId: target.salesRepId,
            year: String(target.year),
            month: String(target.month),
            targetAmount: String(target.targetAmount),
            targetCount: String(target.targetCount ?? ''),
            notes: target.notes || ''
        });
        setError('');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.salesRepId || !formData.targetAmount) { setError('المندوب والمبلغ المستهدف مطلوبان'); return; }
        setIsSaving(true); setError('');
        try {
            const payload = {
                salesRepId: formData.salesRepId,
                year: parseInt(formData.year),
                month: parseInt(formData.month),
                targetAmount: parseFloat(formData.targetAmount),
                targetCount: formData.targetCount ? parseInt(formData.targetCount) : undefined,
                notes: formData.notes || undefined
            };
            const res = await fetch('/api/sales-targets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) { setIsModalOpen(false); fetchTargets(); }
            else { const d = await res.json(); setError(d.error || 'فشل الحفظ'); }
        } catch { setError('فشل في الاتصال'); }
        finally { setIsSaving(false); }
    };

    const handleCopyPrevMonth = async () => {
        setIsCopying(true);
        try {
            const prevMonth = parseInt(month) === 1 ? 12 : parseInt(month) - 1;
            const prevYear = parseInt(month) === 1 ? parseInt(year) - 1 : parseInt(year);
            const res = await fetch(`/api/sales-targets?year=${prevYear}&month=${prevMonth}`);
            if (!res.ok) return;
            const prevTargets: SalesTarget[] = await res.json();
            await Promise.all(prevTargets.map(pt =>
                fetch('/api/sales-targets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        salesRepId: pt.salesRepId,
                        year: parseInt(year),
                        month: parseInt(month),
                        targetAmount: pt.targetAmount,
                        targetCount: pt.targetCount,
                        notes: pt.notes
                    })
                })
            ));
            fetchTargets();
        } catch { }
        finally { setIsCopying(false); }
    };

    const yearOptions = Array.from({ length: 5 }, (_, i) => {
        const y = now.getFullYear() - 2 + i;
        const ys = String(y);
        return { value: ys, label: ys[0] + '⁠' + ys.slice(1) };
    });

    // Reps with no target for current period
    const repsWithTarget = new Set(targets.map(t => t.salesRepId));
    const repsWithoutTarget = reps.filter(r => !repsWithTarget.has(r.id));

    return (
        <DashboardLayout>
            <div dir="rtl" style={PAGE_BASE}>
                <PageHeader
                    title="الأهداف"
                    subtitle="تحديد ومتابعة أهداف مناديب المبيعات"
                    icon={Target}
                    primaryButton={{
                        label: 'تحديد هدف جديد',
                        onClick: () => openAdd(),
                        icon: Plus
                    }}
                />

                {/* KPI — يستخدم StatCard الموحّد */}
                {!loading && (
                    <StatCardGrid cols={3}>
                        <StatCard
                            label="إجمالي الأهداف"
                            value={targets.reduce((s, t) => s + Number(t.targetAmount), 0).toLocaleString('ar-SA')}
                            icon={<Target size={18} />}
                            color={C.primary}
                        />
                        <StatCard
                            label="إجمالي المحقق"
                            value={targets.reduce((s, t) => s + Number(t.achievedAmount || 0), 0).toLocaleString('ar-SA')}
                            icon={<TrendingUp size={18} />}
                            color={C.success}
                        />
                        <StatCard
                            label="مناديب بأهداف محددة"
                            value={targets.length}
                            suffix="مندوب"
                            icon={<Users size={18} />}
                            color={C.warning}
                        />
                    </StatCardGrid>
                )}

                {/* Filters */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
                    <div style={{ minWidth: '120px' }}>
                        <CustomSelect value={year} onChange={setYear} style={{ background: C.card }} options={yearOptions} />
                    </div>
                    <div style={{ minWidth: '140px' }}>
                        <CustomSelect
                            value={month} onChange={setMonth} style={{ background: C.card }}
                            options={MONTHS_AR.map((m, i) => ({ value: String(i + 1), label: m }))}
                        />
                    </div>
                    <button
                        onClick={handleCopyPrevMonth}
                        disabled={isCopying}
                        style={{
                            height: '42px', padding: '0 18px', borderRadius: '10px',
                            background: `${C.teal}12`,
                            border: `1px solid ${C.teal}40`,
                            color: C.teal,
                            cursor: isCopying ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            fontSize: '13px', fontWeight: 700, fontFamily: CAIRO,
                            transition: 'all 0.2s',
                            opacity: isCopying ? 0.6 : 1,
                        }}
                        onMouseEnter={e => { if (!isCopying) e.currentTarget.style.background = `${C.teal}22`; }}
                        onMouseLeave={e => { e.currentTarget.style.background = `${C.teal}12`; }}
                    >
                        {isCopying ? <Loader2 size={14} style={{ animation: 'spin 1.2s linear infinite' }} /> : <Copy size={14} />}
                        نسخ من الشهر السابق
                    </button>
                </div>

                {/* Targets Cards */}
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px', color: C.textSecondary }}>
                        <Loader2 size={36} style={{ animation: 'spin 1.2s linear infinite' }} />
                    </div>
                ) : (
                    <div>
                        {/* Reps with targets */}
                        {targets.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                                {targets.map((target) => {
                                    const achieved = Number(target.achievedAmount || 0);
                                    const goal = Number(target.targetAmount);
                                    const pct = goal > 0 ? Math.round((achieved / goal) * 100) : 0;
                                    const cardColor = pct >= 100 ? C.success : pct >= 70 ? C.warning : C.danger;

                                    return (
                                        <div key={target.id} style={{
                                            background: `${cardColor}08`,
                                            border: `1px solid ${cardColor}33`,
                                            borderRadius: '10px',
                                            padding: '18px',
                                            transition: 'all 0.2s',
                                        }}
                                            onMouseEnter={e => { e.currentTarget.style.background = `${cardColor}14`; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = `${cardColor}08`; }}
                                        >
                                            {/* Header: اسم المندوب + زر تعديل */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    {/* Avatar */}
                                                    <div style={{
                                                        width: '34px', height: '34px', borderRadius: '8px', flexShrink: 0,
                                                        background: `${cardColor}20`, border: `1px solid ${cardColor}40`,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        color: cardColor, fontSize: '13px', fontWeight: 700, fontFamily: OUTFIT,
                                                    }}>
                                                        {(target.salesRep?.name || '?').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: C.textPrimary, fontFamily: CAIRO }}>{target.salesRep?.name || '—'}</p>
                                                        {target.salesRep?.code && <p style={{ margin: '2px 0 0', fontSize: '11px', color: cardColor, fontFamily: OUTFIT }}>{target.salesRep.code}</p>}
                                                    </div>
                                                </div>
                                                <button onClick={() => openEdit(target)} style={{ ...TABLE_STYLE.actionBtn(cardColor), flexShrink: 0 }}>
                                                    <Edit2 size={13} />
                                                </button>
                                            </div>

                                            {/* Progress bar */}
                                            <div style={{ marginBottom: '14px', borderTop: `1px solid ${cardColor}20`, paddingTop: '12px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                    <span style={{ fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO }}>الإنجاز</span>
                                                    <span style={{ fontSize: '18px', fontWeight: 800, color: cardColor, fontFamily: OUTFIT }}>{pct}%</span>
                                                </div>
                                                <div style={{ width: '100%', height: '6px', borderRadius: '4px', background: `${cardColor}20`, overflow: 'hidden' }}>
                                                    <div style={{
                                                        height: '100%', borderRadius: '4px', background: cardColor,
                                                        width: `${Math.min(pct, 100)}%`, transition: 'width 0.4s ease'
                                                    }} />
                                                </div>
                                            </div>

                                            {/* الهدف vs المحقق */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                <div style={{
                                                    padding: '8px 10px', background: `${cardColor}06`,
                                                    borderRadius: '8px', border: `1px solid ${cardColor}20`,
                                                }}>
                                                    <p style={{ margin: 0, fontSize: '10px', color: C.textMuted, fontFamily: CAIRO, marginBottom: '3px' }}>الهدف</p>
                                                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: C.textPrimary, fontFamily: OUTFIT }}>{goal.toLocaleString('ar-SA')}</p>
                                                </div>
                                                <div style={{
                                                    padding: '8px 10px', background: `${cardColor}12`,
                                                    borderRadius: '8px', border: `1px solid ${cardColor}30`,
                                                }}>
                                                    <p style={{ margin: 0, fontSize: '10px', color: C.textMuted, fontFamily: CAIRO, marginBottom: '3px' }}>المحقق</p>
                                                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: cardColor, fontFamily: OUTFIT }}>{achieved.toLocaleString('ar-SA')}</p>
                                                </div>
                                            </div>

                                            {target.notes && (
                                                <p style={{ margin: '10px 0 0', fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO, borderTop: `1px solid ${cardColor}15`, paddingTop: '8px' }}>{target.notes}</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Reps without targets */}
                        {repsWithoutTarget.length > 0 && (
                            <div>
                                <p style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO, marginBottom: '12px' }}>
                                    مناديب بدون أهداف محددة ({repsWithoutTarget.length})
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    {repsWithoutTarget.map(rep => (
                                        <div key={rep.id} style={{
                                            padding: '12px 16px', borderRadius: '12px',
                                            background: 'rgba(255,255,255,0.04)', border: `1px dashed ${C.border}`,
                                            display: 'flex', alignItems: 'center', gap: '12px'
                                        }}>
                                            <span style={{ fontFamily: CAIRO, fontSize: '13px', color: C.textSecondary }}>{rep.name}</span>
                                            <button
                                                onClick={() => openAdd(rep)}
                                                style={{
                                                    padding: '4px 12px', borderRadius: '8px', border: `1px solid ${C.primary}40`,
                                                    background: `${C.primary}15`, color: C.primary,
                                                    cursor: 'pointer', fontSize: '11px', fontWeight: 700, fontFamily: CAIRO,
                                                    display: 'flex', alignItems: 'center', gap: '4px'
                                                }}
                                            >
                                                <Plus size={12} /> تحديد هدف
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {targets.length === 0 && repsWithoutTarget.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '80px 20px', color: C.textSecondary, fontFamily: CAIRO }}>
                                <p style={{ margin: 0, fontSize: '15px' }}>لا توجد أهداف محددة لهذا الشهر</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Target Modal */}
                <AppModal
                    show={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title={editTarget ? 'تعديل الهدف' : 'تحديد هدف جديد'}
                    icon={editTarget ? Edit2 : Plus}
                    maxWidth="460px"
                >
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={LS}>المندوب <span style={{ color: C.danger }}>*</span></label>
                            <CustomSelect
                                value={formData.salesRepId}
                                onChange={v => setFormData({ ...formData, salesRepId: v })}
                                placeholder="اختر المندوب..."
                                style={{ background: C.card }}
                                options={reps.map(r => ({ value: r.id, label: r.name }))}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={LS}>السنة</label>
                                <CustomSelect value={formData.year} onChange={v => setFormData({ ...formData, year: v })} style={{ background: C.card }} options={yearOptions} />
                            </div>
                            <div>
                                <label style={LS}>الشهر</label>
                                <CustomSelect
                                    value={formData.month} onChange={v => setFormData({ ...formData, month: v })}
                                    style={{ background: C.card }}
                                    options={MONTHS_AR.map((m, i) => ({ value: String(i + 1), label: m }))}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={LS}>المبلغ المستهدف <span style={{ color: C.danger }}>*</span></label>
                                <input type="number" min="0" step="0.01" style={{ ...IS, fontFamily: OUTFIT }} value={formData.targetAmount} onChange={e => setFormData({ ...formData, targetAmount: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                            <div>
                                <label style={LS}>عدد الفواتير المستهدف</label>
                                <input type="number" min="0" style={{ ...IS, fontFamily: OUTFIT }} value={formData.targetCount} onChange={e => setFormData({ ...formData, targetCount: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={LS}>ملاحظات</label>
                            <textarea style={{ ...IS, height: '60px', padding: '10px', resize: 'none' }} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                        </div>
                        {error && (
                            <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: C.danger, fontSize: '13px', fontFamily: CAIRO, marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <AlertCircle size={14} /> {error}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="submit" disabled={isSaving} style={{ ...BTN_PRIMARY(false, isSaving), flex: 1, height: '44px' }}>
                                {isSaving ? <Loader2 size={16} style={{ animation: 'spin 1.2s linear infinite' }} /> : 'حفظ الهدف'}
                            </button>
                            <button type="button" onClick={() => setIsModalOpen(false)} style={{ height: '44px', padding: '0 20px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>
                                إلغاء
                            </button>
                        </div>
                    </form>
                </AppModal>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}` }} />
        </DashboardLayout>
    );
}
