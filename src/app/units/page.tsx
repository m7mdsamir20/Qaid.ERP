'use client';
import { useTranslation } from '@/lib/i18n';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import AppModal from '@/components/AppModal';
import PageHeader from '@/components/PageHeader';
import {
    Plus, Lock, Loader2, Scale, Search,
    CheckCircle, XCircle, Pencil, Info, X, Wallet, Trash2
} from 'lucide-react';
import { 
    C, CAIRO, INTER, IS, LS, SC, PAGE_BASE, 
    BTN_PRIMARY, focusIn, focusOut, 
    TABLE_STYLE, KPI_STYLE, KPI_ICON 
} from '@/constants/theme';

interface Unit {
    id: string;
    code: string;
    name: string;
    nameEn: string | null;
    status: string;
    createdAt: string;
}

export default function UnitsPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [search, setSearch] = useState('');
    const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const userRole = 'admin'; // Static for UI mock, should come from auth
    const canCreate = userRole === 'admin' || userRole === 'storekeeper';
    const canEdit = userRole === 'admin';

    const [form, setForm] = useState({
        id: '', name: '', nameEn: '', code: '', status: 'active',
    });

    const fetchUnits = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/units');
            if (res.ok) setUnits(await res.json());
        } catch (err) {
            console.error('Fetch units failed:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUnits(); }, [fetchUnits]);

    const handleDelete = async () => {
        if (!unitToDelete) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/units?id=${unitToDelete.id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchUnits();
                setUnitToDelete(null);
            } else { 
                alert(t('فشل حذف الوحدة، قد تكون مرتبطة بأصناف مخزنية.')); 
            }
        } catch (err) {
            alert(t('خطأ في عملية الحذف'));
        } finally {
            setIsDeleting(false);
        }
    };

    const openCreateModal = () => {
        let maxId = 0;
        units.forEach(u => {
            if (u.code?.startsWith('UNT-')) {
                const n = parseInt(u.code.replace('UNT-', ''));
                if (!isNaN(n) && n > maxId) maxId = n;
            }
        });
        setForm({ id: '', name: '', nameEn: '', code: `UNT-${String(maxId + 1).padStart(3, '0')}`, status: 'active' });
        setIsModalOpen(true);
    };

    const openEditModal = (unit: Unit) => {
        setForm({ id: unit.id, name: unit.name, nameEn: unit.nameEn || '', code: unit.code, status: unit.status });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/units', {
                method: form.id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (res.ok) { 
                setIsModalOpen(false); 
                fetchUnits(); 
            } else { 
                const d = await res.json(); 
                alert(d.error || t('فشل في الحفظ')); 
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const filtered = units.filter(u =>
        u.name.includes(search) ||
        (u.nameEn || '').toLowerCase().includes(search.toLowerCase()) ||
        u.code.includes(search)
    );

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ ...PAGE_BASE, background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>
                
                {/* Page Header (Consolidated Design) */}
                <PageHeader 
                    title={t("وحدات القياس")} 
                    subtitle={t("إدارة وحدات قياس الأصناف المخزنية (قطعة، كرتونة، لتر، إلخ)")} 
                    icon={Scale} 
                    primaryButton={canCreate ? {
                        label: t("إضافة وحدة جديدة"),
                        onClick: openCreateModal,
                        icon: Plus
                    } : undefined}
                />

                {/* Independent Search Header (Sales Style - Expanded) */}
                <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', color: C.primary, pointerEvents: 'none' }} />
                        <input
                            placeholder={t("ابحث باسم الوحدة أو الكود...")}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ ...IS, width: '100%', paddingInlineEnd: '40px', height: '36px', borderRadius: '6px', background: C.card, fontSize: '13px' }}
                            onFocus={focusIn} onBlur={focusOut}
                        />
                    </div>
                </div>

                {/* Main Table Content (Directly, No SC) */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '100px', color: C.textMuted }}>
                        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: C.primary, margin: '0 auto 16px' }} />
                        <p style={{ fontWeight: 600 }}>{t('جاري استخراج البيانات...')}</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 20px', color: C.textMuted }}>
                        <Scale size={56} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.1 }} />
                        <p style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>{search ? t('لا توجد نتائج بحث تطابق استفسارك') : t('لا توجد وحدات قياس مسجلة حالياً')}</p>
                    </div>
                ) : (
                    <div style={TABLE_STYLE.container}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        {[t('الكود'), t('اسم الوحدة'), t('الحالة'), t('إجراء')].map((h, i) => (
                                            <th key={i} style={TABLE_STYLE.th(i === 0)}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((unit, idx) => (
                                        <tr key={unit.id} 
                                            style={TABLE_STYLE.row(idx === filtered.length - 1)}
                                            onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.15)'}>
                                            <td style={TABLE_STYLE.td(true)}>
                                                <div style={{ color: C.primary, fontWeight: 900, fontFamily: INTER, fontSize: '11px', opacity: 0.7 }}>
                                                    {unit.code}
                                                </div>
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), color: C.textPrimary, fontWeight: 800, fontSize: '14px' }}>{unit.name}</td>
                                            <td style={TABLE_STYLE.td(false)}>
                                                <div style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                    padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800,
                                                    background: unit.status === 'active' ? 'rgba(74,222,128,0.12)' : 'rgba(251,113,133,0.12)',
                                                    color: unit.status === 'active' ? C.success : C.danger, 
                                                    border: `1px solid ${unit.status === 'active' ? 'rgba(74,222,128,0.22)' : 'rgba(251,113,133,0.22)'}`
                                                }}>
                                                    {unit.status === 'active' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                                    {unit.status === 'active' ? t('نشط') : t('متوقف')}
                                                </div>
                                            </td>
                                            <td style={TABLE_STYLE.td(false)}>
                                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                                                    {canEdit && (
                                                        <>
                                                            <button onClick={() => openEditModal(unit)}
                                                                style={TABLE_STYLE.actionBtn()}
                                                                title={t("تعديل")}
                                                            >
                                                                 <Pencil size={TABLE_STYLE.actionIconSize} />
                                                            </button>
                                                            <button onClick={() => setUnitToDelete(unit)}
                                                                style={TABLE_STYLE.actionBtn(C.danger)}
                                                                title={t("حذف")}
                                                            >
                                                                 <Trash2 size={TABLE_STYLE.actionIconSize} />
                                                            </button>
                                                        </>
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

                {/* Data Modal */}
                <AppModal
                    show={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    icon={form.id ? Pencil : Plus}
                    title={form.id ? t('تعديل بيانات وحدة القياس') : t('إضافة وحدة قياس جديدة')}
                    maxWidth="440px"
                >
                    <form onSubmit={handleSubmit}>
                        {/* Info Note */}
                        <div style={{ 
                            display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px', 
                            borderRadius: '12px', background: 'rgba(37,106,244,0.05)', border: `1px solid ${C.primary}20`, marginBottom: '20px' 
                        }}>
                            <Info size={16} style={{ color: C.primary, marginTop: '2px', flexShrink: 0 }} />
                            <p style={{ margin: 0, fontSize: '12px', color: C.textSecondary, lineHeight: 1.5, fontWeight: 600 }}>
                                {t('وحدات القياس تحدد دقة الكميات المتاحة للأصناف (مثل: قطعة، كرتونة، لتر). تأكد من إدخال اسم فريد.')}
                            </p>
                        </div>

                        {/* Auto Code */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={LS}>{t('كود الوحدة النظامي')}</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text" readOnly disabled value={form.code}
                                    style={{ ...IS, paddingInlineStart: '42px', color: C.textMuted, cursor: 'not-allowed', background: 'rgba(255,255,255,0.01)', fontFamily: INTER }}
                                />
                                <Lock size={14} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} />
                            </div>
                        </div>

                        {/* Unit Name */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={LS}>{t('اسم الوحدة')} <span style={{ color: C.danger }}>*</span></label>
                            <input
                                type="text" required autoFocus
                                placeholder={t("مثال: قطعة، كيلو")}
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                style={IS}
                                onFocus={focusIn} onBlur={focusOut}
                            />
                        </div>

                        {/* Status Switch (Premium) */}
                        {form.id && (
                            <div style={{ 
                                marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`,
                                transition: '0.3s', boxShadow: form.status === 'active' ? '0 4px 15px rgba(16,185,129,0.05)' : '0 4px 15px rgba(251,113,133,0.05)'
                            }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ ...LS, marginBottom: '2px', display: 'block', color: form.status === 'active' ? '#10b981' : '#fb7185', transition: '0.3s' }}>
                                        {form.status === 'active' ? t('الوحدة نشطة') : t('الوحدة متوقفة')}
                                    </label>
                                    <span style={{ fontSize: '11px', color: C.textMuted, fontWeight: 600 }}>
                                        {form.status === 'active' ? t('سيتم عرض الوحدة في جميع قوائم الاختيار') : t('سيتم إخفاء الوحدة مؤقتاً من الفواتير')}
                                    </span>
                                </div>
                                
                                <div 
                                    onClick={() => setForm({ ...form, status: form.status === 'active' ? 'inactive' : 'active' })}
                                    style={{ 
                                        width: '52px', height: '26px', borderRadius: '26px', 
                                        background: form.status === 'active' ? 'rgba(16,185,129,0.2)' : 'rgba(251,113,133,0.2)',
                                        border: `1px solid ${form.status === 'active' ? '#10b98160' : '#fb718560'}`,
                                        position: 'relative', cursor: 'pointer', transition: '0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                        boxShadow: `inset 0 2px 4px rgba(0,0,0,0.1)`
                                    }}>
                                    
                                    {/* Animated Knob */}
                                    <div style={{ 
                                        width: '20px', height: '20px', borderRadius: '50%', 
                                        background: '#fff',
                                        position: 'absolute', top: '2px', transition: '0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                        right: form.status === 'active' ? '28px' : '2px',
                                        boxShadow: form.status === 'active' ? '0 0 10px #10b98180' : '0 0 10px #fb718580',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <div style={{ 
                                            width: '6px', height: '6px', borderRadius: '50%', 
                                            background: form.status === 'active' ? '#10b981' : '#fb7185'
                                        }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                            <button type="submit" disabled={isSubmitting} 
                                style={{ ...BTN_PRIMARY(false, isSubmitting), flex: 1.5, height: '48px', fontSize: '14px' }}>
                                {isSubmitting ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : t('حفظ البيانات')}
                            </button>
                            <button type="button" onClick={() => setIsModalOpen(false)} 
                                style={{ 
                                    flex: 1, borderRadius: '14px', border: `1px solid ${C.border}`, 
                                    background: 'rgba(255,255,255,0.03)', color: C.textSecondary, 
                                    fontWeight: 800, cursor: 'pointer', transition: '0.2s', fontSize: '14px' 
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = C.textPrimary; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = C.textSecondary; }}
                            >
                                {t('إلغاء')}
                            </button>
                        </div>
                    </form>
                </AppModal>

                <AppModal
                    show={!!unitToDelete}
                    onClose={() => setUnitToDelete(null)}
                    onConfirm={handleDelete}
                    title={t("تأكيد حذف وحدة القياس")}
                    itemName={unitToDelete?.name || ''}
                    isDelete={true}
                    isSubmitting={isDeleting}
                />
            </div>
            <style jsx global>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </DashboardLayout>
    );
}
