'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import AppModal from '@/components/AppModal';
import PageHeader from '@/components/PageHeader';
import { Plus, Loader2, Search, Pencil, Info, Trash2, Layers, FolderTree } from 'lucide-react';
import { C, CAIRO, OUTFIT, IS, LS, PAGE_BASE, BTN_PRIMARY, focusIn, focusOut, TABLE_STYLE } from '@/constants/theme';
import { useSession } from 'next-auth/react';

interface Category {
    id: string;
    name: string;
    createdAt: string;
    _count?: {
        items: number;
    };
}

export default function CategoriesPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [search, setSearch] = useState('');
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const userRole = (session?.user as any)?.role || 'admin';
    const canCreate = userRole === 'admin' || userRole === 'storekeeper';
    const canEdit = userRole === 'admin' || userRole === 'storekeeper';

    const businessType = (session?.user as any)?.businessType?.toUpperCase();
    const isServices = businessType === 'SERVICES';

    const [form, setForm] = useState({ id: '', name: '' });

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/categories');
            if (res.ok) setCategories(await res.json());
        } catch (err) {
            console.error('Fetch categories failed:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCategories(); }, [fetchCategories]);

    const handleDelete = async () => {
        if (!categoryToDelete) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/categories?id=${categoryToDelete.id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchCategories();
                setCategoryToDelete(null);
            } else { 
                const d = await res.json();
                alert(d.error || t('فشل حذف التصنيف، قد يكون مرتبطاً ب') + (isServices ? t('خدمات') : t('أصناف مخزنية'))); 
            }
        } catch (err) {
            alert(t('خطأ في عملية الحذف'));
        } finally {
            setIsDeleting(false);
        }
    };

    const openCreateModal = () => {
        setForm({ id: '', name: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (cat: Category) => {
        setForm({ id: cat.id, name: cat.name });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/categories', {
                method: form.id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (res.ok) { 
                setIsModalOpen(false); 
                fetchCategories(); 
            } else { 
                const d = await res.json(); 
                alert(d.error || t('فشل في الحفظ')); 
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const filtered = categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ ...PAGE_BASE, background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>
                
                {/* Page Header */}
                <PageHeader 
                    title={isServices ? t("تصنيفات الخدمات") : t("تصنيفات الأصناف")} 
                    subtitle={isServices ? t("إدارة وتبويب الخدمات المقدمة إلى مجموعات لتسهيل عملية الفوترة والتقارير") : t("إدارة وتبويب الأصناف المخزنية إلى مجموعات لتسهيل عملية الجرد والبيع")} 
                    icon={FolderTree} 
                    primaryButton={canCreate ? {
                        label: t("إضافة تصنيف جديد"),
                        onClick: openCreateModal,
                        icon: Plus
                    } : undefined}
                />

                {/* Independent Search Header */}
                <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', insetInlineStart: '12px', top: '50%', transform: 'translateY(-50%)', color: C.primary, pointerEvents: 'none' }} />
                        <input
                            placeholder={t("ابحث باسم التصنيف...")}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ ...IS, width: '100%', paddingInlineStart: '40px', height: '42px', borderRadius: '10px', background: C.card, fontSize: '13px' }}
                            onFocus={focusIn} onBlur={focusOut}
                        />
                    </div>
                </div>

                {/* Main Table Content */}
                {loading ? (
                    <div style={{ padding: '100px', color: C.textMuted }}>
                        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: C.primary, margin: '0 auto 16px' }} />
                        <p style={{ fontWeight: 600 }}>{t('جاري استخراج البيانات...')}</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '80px 20px', color: C.textMuted }}>
                        <Layers size={56} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.1 }} />
                        <p style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>{search ? t('لا توجد نتائج بحث تطابق استفسارك') : t('لا توجد تصنيفات مسجلة حالياً')}</p>
                    </div>
                ) : (
                    <div style={TABLE_STYLE.container}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        {[t('الرقم'), t('اسم التصنيف'), isServices ? t('عدد الخدمات المرتبطة') : t('عدد الأصناف المرتبطة'), t('إجراء')].map((h, i) => (
                                            <th key={i} style={TABLE_STYLE.th(i === 0, [2, 3].includes(i))}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((cat, idx) => (
                                        <tr key={cat.id} 
                                            style={TABLE_STYLE.row(idx === filtered.length - 1)}
                                            onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={TABLE_STYLE.td(true)}>
                                                <div style={{ color: C.textMuted, fontWeight: 900, fontFamily: OUTFIT, fontSize: '12px' }}>
                                                    #{idx + 1}
                                                </div>
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), color: C.textPrimary, fontWeight: 800, fontSize: '14px' }}>
                                                {cat.name}
                                            </td>
                                            <td style={TABLE_STYLE.td(false, true)}>
                                                <div style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                    padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 900, fontFamily: OUTFIT,
                                                    background: 'rgba(56,189,248,0.1)', color: '#38bdf8'
                                                }}>
                                                    {cat._count?.items || 0} {isServices ? t('خدمة') : t('صنف')}
                                                </div>
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    {canEdit && (
                                                        <button onClick={() => openEditModal(cat)}
                                                            style={TABLE_STYLE.actionBtn()} title={t("تعديل")}>
                                                             <Pencil size={TABLE_STYLE.actionIconSize} />
                                                        </button>
                                                    )}
                                                    {canEdit && (
                                                        <button onClick={() => setCategoryToDelete(cat)}
                                                            style={TABLE_STYLE.actionBtn(C.danger)} title={t("حذف")}>
                                                             <Trash2 size={TABLE_STYLE.actionIconSize} />
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

                {/* Data Modal */}
                <AppModal
                    show={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    icon={form.id ? Pencil : Plus}
                    title={form.id ? t('تعديل بيانات التصنيف') : t('إضافة تصنيف جديد')}
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
                                {isServices 
                                    ? t("استخدم التصنيفات لتجميع الخدمات المتشابهة لتسهيل عملية الفوترة وإصدار التقارير التحليلية.")
                                    : t("استخدم التصنيفات لتجميع الأصناف المتشابهة في المخزون وفي نقطة البيع (POS).")}
                            </p>
                        </div>

                        {/* Category Name */}
                        <div style={{ marginBottom: '24px' }}>
                            <label style={LS}>{t('اسم التصنيف')} <span style={{ color: C.danger }}>*</span></label>
                            <input
                                type="text" required autoFocus
                                placeholder={isServices ? t("مثال: صيانة، استشارات، تركيبات...") : t("مثال: إلكترونيات، ملابس، مأكولات...")}
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                style={{ ...IS, height: '42px' }}
                                onFocus={focusIn} onBlur={focusOut}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
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
                    show={!!categoryToDelete}
                    onClose={() => setCategoryToDelete(null)}
                    onConfirm={handleDelete}
                    title={t("تأكيد حذف التصنيف")}
                    itemName={categoryToDelete?.name || ''}
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
