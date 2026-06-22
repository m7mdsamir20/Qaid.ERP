'use client';
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import CustomSelect from '@/components/CustomSelect';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import {
    Users, Plus, Loader2, Search, Eye, Edit2, Phone, Mail,
    TrendingUp, BadgeCheck, AlertCircle, DollarSign
} from 'lucide-react';
import {
    C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut,
    PAGE_BASE, BTN_PRIMARY, SEARCH_STYLE
} from '@/constants/theme';
import StatCard, { StatCardGrid } from '@/components/StatCard';

interface SalesRep {
    id: string;
    code?: string;
    name: string;
    phone?: string;
    email?: string;
    commissionRate?: number;
    commissionType?: string;
    isActive: boolean;
    userId?: string;
    employeeId?: string;
    _count?: { customers: number; invoices: number };
}

interface Lookups {
    users: { id: string; name: string; email: string }[];
    employees: { id: string; name: string; code: string }[];
}

const EMPTY_FORM = {
    name: '', code: '', phone: '', email: '',
    commissionRate: '0', commissionType: 'invoice_total',
    userId: '', employeeId: '', isActive: true
};

export default function SalesRepsPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const { t } = useTranslation();

    const [reps, setReps] = useState<SalesRep[]>([]);
    const [lookups, setLookups] = useState<Lookups>({ users: [], employees: [] });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editRep, setEditRep] = useState<SalesRep | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({ ...EMPTY_FORM });
    const [error, setError] = useState('');

    const isAdmin = (session?.user as any)?.role === 'admin' || (session?.user as any)?.isSuperAdmin;

    const fetchAll = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/sales-reps?includeLookups=true');
            if (res.ok) {
                const data = await res.json();
                setReps(data.salesReps || data);
                if (data.lookups) setLookups(data.lookups);
            }
        } catch { } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const openAdd = () => {
        setEditRep(null);
        setFormData({ ...EMPTY_FORM, code: generateRepCode() });
        setError('');
        setIsModalOpen(true);
    };

    const openEdit = (rep: SalesRep) => {
        setEditRep(rep);
        setFormData({
            name: rep.name,
            code: rep.code || '',
            phone: rep.phone || '',
            email: rep.email || '',
            commissionRate: String(rep.commissionRate ?? 0),
            commissionType: rep.commissionType || 'invoice_total',
            userId: rep.userId || '',
            employeeId: rep.employeeId || '',
            isActive: rep.isActive
        });
        setError('');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) { setError('اسم المندوب مطلوب'); return; }
        setIsSaving(true);
        setError('');
        try {
            const payload = {
                ...formData,
                commissionRate: parseFloat(formData.commissionRate) || 0
            };
            const url = editRep ? `/api/sales-reps/${editRep.id}` : '/api/sales-reps';
            const method = editRep ? 'PATCH' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setIsModalOpen(false);
                fetchAll();
            } else {
                const d = await res.json();
                setError(d.error || 'فشل في الحفظ');
            }
        } catch { setError('فشل في الاتصال بالخادم'); }
        finally { setIsSaving(false); }
    };

    const filtered = reps.filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.phone || '').includes(searchTerm)
    );

    const totalReps = reps.length;
    const activeReps = reps.filter(r => r.isActive).length;

    /** توليد كود مندوب تلقائي بصيغة REP001, REP002, ... */
    const generateRepCode = () => {
        const maxNum = reps.reduce((max, r) => {
            const match = (r.code || '').match(/(\d+)$/);
            return match ? Math.max(max, parseInt(match[1])) : max;
        }, 0);
        return `REP${String(maxNum + 1).padStart(3, '0')}`;
    };

    const kpiCards = [
        { label: 'إجمالي المناديب', value: totalReps, color: C.primary, icon: Users, suffix: 'مندوب' },
        { label: 'مناديب نشطون', value: activeReps, color: C.success, icon: BadgeCheck, suffix: 'مندوب' },
        { label: 'إجمالي مبيعات الشهر', value: '—', color: C.teal, icon: TrendingUp, isMoney: true },
        { label: 'عمولات مستحقة', value: '—', color: C.warning, icon: DollarSign, isMoney: true }
    ];

    return (
        <DashboardLayout>
            <div dir="rtl" style={PAGE_BASE}>
                <PageHeader
                    title="إدارة المناديب"
                    subtitle="متابعة مناديب المبيعات وعمولاتهم وأهدافهم"
                    icon={Users}
                    primaryButton={isAdmin ? {
                        label: 'مندوب جديد',
                        onClick: openAdd,
                        icon: Plus
                    } : undefined}
                />

                {/* KPI Row — 4 كروت بتصميم StatCard الموحّد */}
                {!loading && (
                    <StatCardGrid cols={4}>
                        <StatCard
                            label={t('إجمالي المناديب')}
                            value={totalReps}
                            suffix={t('مندوب')}
                            icon={<Users size={18} />}
                            color={C.primary}
                        />
                        <StatCard
                            label={t('مناديب نشطون')}
                            value={activeReps}
                            suffix={t('مندوب')}
                            icon={<BadgeCheck size={18} />}
                            color={C.success}
                        />
                        <StatCard
                            label={t('إجمالي مبيعات الشهر')}
                            value="—"
                            icon={<TrendingUp size={18} />}
                            color={C.teal}
                        />
                        <StatCard
                            label={t('عمولات مستحقة')}
                            value="—"
                            icon={<DollarSign size={18} />}
                            color={C.warning}
                        />
                    </StatCardGrid>
                )}

                {/* Search */}
                <div style={{ ...SEARCH_STYLE.container, marginBottom: '20px' }}>
                    <div style={SEARCH_STYLE.wrapper}>
                        <Search size={SEARCH_STYLE.iconSize} style={SEARCH_STYLE.icon(C.primary)} />
                        <input
                            placeholder="ابحث باسم المندوب أو الكود أو الهاتف..."
                            style={{ ...SEARCH_STYLE.input }}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onFocus={focusIn} onBlur={focusOut}
                        />
                    </div>
                </div>

                {/* Rep Cards Grid */}
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px', color: C.textSecondary }}>
                        <Loader2 size={36} style={{ animation: 'spin 1.2s linear infinite' }} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 20px', color: C.textSecondary, fontFamily: CAIRO }}>
                        <Users size={48} style={{ opacity: 0.3, marginBottom: '16px', display: 'block', margin: '0 auto 16px' }} />
                        <p style={{ fontSize: '15px', margin: 0 }}>{searchTerm ? 'لا توجد نتائج مطابقة' : 'لا يوجد مناديب مسجلون بعد'}</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                        {filtered.map((rep, idx) => {
                            const repColor = rep.isActive ? C.primary : '#ef4444';
                            return (
                            <div key={rep.id} style={{
                                background: `${repColor}08`,
                                border: `1px solid ${repColor}33`,
                                borderRadius: '10px',
                                padding: '18px',
                                transition: 'all 0.2s',
                                display: 'flex', flexDirection: 'column', gap: '12px',
                                position: 'relative',
                            }}
                                onMouseEnter={e => { e.currentTarget.style.background = `${repColor}14`; }}
                                onMouseLeave={e => { e.currentTarget.style.background = `${repColor}08`; }}
                            >
                                {/* Card Header */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{
                                        padding: '3px 10px', borderRadius: '7px',
                                        background: `${repColor}20`, color: repColor,
                                        fontSize: '12px', fontWeight: 700, fontFamily: OUTFIT,
                                        border: `1px solid ${repColor}30`,
                                    }}>
                                        {rep.code || `REP-${String(idx + 1).padStart(5, '0')}`}
                                    </span>
                                    <span style={{
                                        padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                                        background: rep.isActive ? 'rgba(74,222,128,0.12)' : 'rgba(239,68,68,0.12)',
                                        color: rep.isActive ? C.success : C.danger,
                                        border: `1px solid ${rep.isActive ? 'rgba(74,222,128,0.25)' : 'rgba(239,68,68,0.25)'}`,
                                        fontFamily: CAIRO
                                    }}>
                                        {rep.isActive ? 'نشط' : 'موقوف'}
                                    </span>
                                </div>

                                {/* Name & Contact */}
                                <div style={{ borderTop: `1px solid ${repColor}20`, paddingTop: '10px' }}>
                                    <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '14px', color: C.textPrimary, fontFamily: CAIRO }}>{rep.name}</p>
                                    {rep.phone && (
                                        <p style={{ margin: '0 0 3px', fontSize: '12px', color: C.textSecondary, display: 'flex', alignItems: 'center', gap: '6px', fontFamily: CAIRO }}>
                                            <Phone size={12} style={{ color: repColor }} /> {rep.phone}
                                        </p>
                                    )}
                                    {rep.email && (
                                        <p style={{ margin: 0, fontSize: '12px', color: C.textSecondary, display: 'flex', alignItems: 'center', gap: '6px', fontFamily: CAIRO }}>
                                            <Mail size={12} style={{ color: repColor }} /> {rep.email}
                                        </p>
                                    )}
                                </div>

                                {/* Commission Info */}
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{
                                        padding: '4px 10px', borderRadius: '7px', fontSize: '12px', fontWeight: 600,
                                        background: `${C.teal}15`, color: C.teal,
                                        border: `1px solid ${C.teal}30`,
                                        fontFamily: OUTFIT
                                    }}>
                                        عمولة {rep.commissionRate ?? 0}%
                                    </span>
                                    <span style={{
                                        padding: '4px 10px', borderRadius: '7px', fontSize: '11px', fontWeight: 600,
                                        background: `${repColor}08`, color: C.textSecondary,
                                        border: `1px solid ${repColor}20`,
                                        fontFamily: CAIRO
                                    }}>
                                        {rep.commissionType === 'collected_amount' ? 'على التحصيل' : 'على الفاتورة'}
                                    </span>
                                </div>

                                {/* Counts */}
                                <div style={{
                                    display: 'flex', gap: '12px',
                                    padding: '10px', borderRadius: '8px',
                                    background: `${repColor}06`,
                                    border: `1px solid ${repColor}20`,
                                }}>
                                    <div style={{ textAlign: 'center', flex: 1 }}>
                                        <p style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: repColor, fontFamily: OUTFIT }}>{rep._count?.customers ?? 0}</p>
                                        <p style={{ margin: 0, fontSize: '10px', color: C.textSecondary, fontFamily: CAIRO }}>عميل</p>
                                    </div>
                                    <div style={{ width: '1px', background: `${repColor}20` }} />
                                    <div style={{ textAlign: 'center', flex: 1 }}>
                                        <p style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: repColor, fontFamily: OUTFIT }}>{rep._count?.invoices ?? 0}</p>
                                        <p style={{ margin: 0, fontSize: '10px', color: C.textSecondary, fontFamily: CAIRO }}>فاتورة</p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                                    <button
                                        onClick={() => router.push(`/sales-reps/${rep.id}`)}
                                        style={{
                                            flex: 1, height: '36px', borderRadius: '9px',
                                            background: `${repColor}15`, border: `1px solid ${repColor}40`,
                                            color: repColor, cursor: 'pointer', fontSize: '12px',
                                            fontWeight: 700, display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', gap: '6px', fontFamily: CAIRO,
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = `${repColor}25`; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = `${repColor}15`; }}
                                    >
                                        <Eye size={14} /> عرض البروفايل
                                    </button>
                                    {isAdmin && (
                                        <button
                                            onClick={() => openEdit(rep)}
                                            style={{
                                                width: '36px', height: '36px', borderRadius: '9px',
                                                background: `${repColor}08`, border: `1px solid ${repColor}30`,
                                                color: repColor, cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                transition: 'all 0.2s',
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = `${repColor}20`; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = `${repColor}08`; }}
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            );
                        })}
                    </div>
                )}

                {/* Add/Edit Modal */}
                <AppModal
                    show={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title={editRep ? 'تعديل بيانات المندوب' : 'إضافة مندوب جديد'}
                    icon={editRep ? Edit2 : Plus}
                    maxWidth="520px"
                    error={error}
                >
                    <form onSubmit={handleSubmit}>
                        {/* Code (أولاً - تلقائي ومقفول) + Name */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={LS}>الكود</label>
                                <input
                                    style={{
                                        ...IS,
                                        background: 'rgba(255,255,255,0.03)',
                                        color: C.primary,
                                        fontFamily: OUTFIT,
                                        fontWeight: 700,
                                        cursor: 'not-allowed',
                                        opacity: 0.85,
                                    }}
                                    value={formData.code}
                                    readOnly
                                    tabIndex={-1}
                                />
                            </div>
                            <div>
                                <label style={LS}>الاسم <span style={{ color: C.danger }}>*</span></label>
                                <input style={IS} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="اسم المندوب" onFocus={focusIn} onBlur={focusOut} />
                            </div>
                        </div>

                        {/* Phone & Email */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={LS}>الهاتف</label>
                                <input style={IS} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="01xxxxxxxxx" onFocus={focusIn} onBlur={focusOut} />
                            </div>
                            <div>
                                <label style={LS}>البريد الإلكتروني</label>
                                <input style={IS} type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="rep@company.com" onFocus={focusIn} onBlur={focusOut} />
                            </div>
                        </div>

                        {/* Commission Rate & Type */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={LS}>نسبة العمولة (%)</label>
                                <input style={{ ...IS, fontFamily: OUTFIT }} type="number" min="0" max="100" step="0.01" value={formData.commissionRate} onChange={e => setFormData({ ...formData, commissionRate: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                            <div>
                                <label style={LS}>أساس العمولة</label>
                                <CustomSelect
                                    value={formData.commissionType}
                                    onChange={v => setFormData({ ...formData, commissionType: v })}
                                    style={{ background: C.card }}
                                    options={[
                                        { value: 'invoice_total', label: 'على الفاتورة' },
                                        { value: 'collected_amount', label: 'على التحصيل' }
                                    ]}
                                />
                            </div>
                        </div>

                        {/* User & Employee */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={LS}>المستخدم المرتبط</label>
                                <CustomSelect
                                    value={formData.userId}
                                    onChange={v => setFormData({ ...formData, userId: v })}
                                    style={{ background: C.card }}
                                    placeholder="اختر مستخدماً..."
                                    options={lookups.users.map(u => ({ value: u.id, label: u.name || u.email }))}
                                />
                            </div>
                            <div>
                                <label style={LS}>الموظف المرتبط</label>
                                <CustomSelect
                                    value={formData.employeeId}
                                    onChange={v => setFormData({ ...formData, employeeId: v })}
                                    style={{ background: C.card }}
                                    placeholder="اختر موظفاً..."
                                    options={lookups.employees.map(e => ({ value: e.id, label: `${e.code} - ${e.name}` }))}
                                />
                            </div>
                        </div>

                        {/* isActive Toggle */}
                        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <label style={{ ...LS, margin: 0 }}>الحالة:</label>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                style={{
                                    padding: '6px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                                    fontWeight: 700, fontSize: '12px', fontFamily: CAIRO,
                                    background: formData.isActive ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)',
                                    color: formData.isActive ? C.success : C.danger
                                }}
                            >
                                {formData.isActive ? 'نشط' : 'موقوف'}
                            </button>
                        </div>

                        {error && (
                            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: C.danger, fontSize: '13px', fontFamily: CAIRO, marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <AlertCircle size={14} /> {error}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="submit" disabled={isSaving} style={{ ...BTN_PRIMARY(false, isSaving), flex: 1, height: '44px' }}>
                                {isSaving ? <Loader2 size={16} style={{ animation: 'spin 1.2s linear infinite' }} /> : (editRep ? 'حفظ التعديلات' : 'إضافة المندوب')}
                            </button>
                            <button type="button" onClick={() => setIsModalOpen(false)} style={{ height: '44px', padding: '0 20px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>
                                إلغاء
                            </button>
                        </div>
                    </form>
                </AppModal>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }` }} />
        </DashboardLayout>
    );
}
