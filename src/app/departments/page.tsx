'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { BuildingIcon, BriefcaseIcon, Plus, Trash2, Pencil, Users, Loader2, Search, X, Save } from 'lucide-react';
import { C, CAIRO, OUTFIT, TABLE_STYLE, SEARCH_STYLE, KPI_STYLE, KPI_ICON, focusIn, focusOut, PAGE_BASE, IS, LS, BTN_PRIMARY } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';

interface Department {
    id: string;
    name: string;
    _count: { employees: number };
}

export default function DepartmentsPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editDept, setEditDept] = useState<Department | null>(null);
    const [name, setName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [deptToDelete, setDeptToDelete] = useState<Department | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchDepartments = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/departments');
            if (res.ok) {
                setDepartments(await res.json());
            }
        } catch (err) {
            console.error('Failed to fetch departments:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDepartments(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setIsSaving(true);
        try {
            const url = editDept ? `/api/departments/${editDept.id}` : '/api/departments';
            const method = editDept ? 'PATCH' : 'POST';
            
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            
            if (res.ok) {
                setIsModalOpen(false);
                setEditDept(null);
                setName('');
                fetchDepartments();
            } else {
                const data = await res.json();
                alert(data.error || t('فشل في الحفظ'));
            }
        } catch (err) {
            alert(t('حدث خطأ أثناء الحفظ'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = (dept: Department) => {
        if (dept._count.employees > 0) {
            alert(t('لا يمكن حذف القسم لوجود موظفين مرتبطين به. قم بنقل الموظفين أولاً.'));
            return;
        }
        setDeptToDelete(dept);
    };

    const confirmDelete = async () => {
        if (!deptToDelete) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/departments/${deptToDelete.id}`, { method: 'DELETE' });
            if (res.ok) {
                setDeptToDelete(null);
                fetchDepartments();
            } else {
                const data = await res.json();
                alert(data.error || t('فشل الحذف'));
            }
        } catch {
            alert(t('حدث خطأ أثناء الحذف'));
        } finally {
            setIsDeleting(false);
        }
    };

    const openCreateModal = () => {
        setEditDept(null);
        setName('');
        setIsModalOpen(true);
    };

    const openEditModal = (dept: Department) => {
        setEditDept(dept);
        setName(dept.name);
        setIsModalOpen(true);
    };

    const filteredDepartments = departments.filter(d => 
        d.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalEmployees = departments.reduce((acc, d) => acc + d._count.employees, 0);

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                
                {/* Header Section */}
                <PageHeader
                    title={t("الأقسام والوظائف")}
                    subtitle={t("إدارة الهيكل الإداري وتصنيف الموظفين")}
                    icon={BuildingIcon}
                    primaryButton={{
                        label: t("إضافة قسم جديد"),
                        onClick: openCreateModal,
                        icon: Plus
                    }}
                />

                {/* KPI Stats Summary - Standardized */}
                {!loading && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
                        {[
                            { label: t('إجمالي الأقسام'), val: departments.length, color: C.primary, icon: BuildingIcon, suffix: t('قسم') },
                            { label: t('الموظفين المصنفين'), val: totalEmployees, color: '#818cf8', icon: Users, suffix: t('موظف') },
                            { label: t('معدل التوزيع'), val: departments.length > 0 ? (totalEmployees / departments.length).toFixed(1) : 0, color: '#10b981', icon: BriefcaseIcon, suffix: t('لكل قسم') },
                        ].map((s, i) => (
                            <div key={i} style={{
                                background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '10px',
                                padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                transition: 'all 0.2s', position: 'relative'
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                            >
                                <div style={{ textAlign: 'start' }}>
                                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', fontWeight: 800, color: s.color, fontFamily: OUTFIT }} dir="ltr">
                                        <span>{s.val}</span>
                                        {s.suffix && <span style={{ fontSize: '10px', opacity: 0.7, fontFamily: CAIRO, marginInlineStart: '4px' }}>{s.suffix}</span>}
                                    </div>
                                </div>
                                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                    <s.icon size={20} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Toolbar */}
                <div className="mobile-column" style={{ ...SEARCH_STYLE.container, alignItems: 'stretch' }}>
                    <div style={SEARCH_STYLE.wrapper}>
                        <Search size={SEARCH_STYLE.iconSize} style={SEARCH_STYLE.icon(C.primary)} />
                        <input
                            placeholder={t("ابحث عن قسم...")}
                            style={{ ...SEARCH_STYLE.input, height: '40px', borderRadius: '12px', background: C.card }}
                            onFocus={focusIn}
                            onBlur={focusOut}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Departments Grid */}
                {loading ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                        <Loader2 size={32} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 16px', display: 'block' }} />
                        <p style={{ fontSize: '13px', fontWeight: 800, fontFamily: CAIRO }}>{t('جاري تحميل البيانات...')}</p>
                    </div>
                ) : filteredDepartments.length === 0 ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <BuildingIcon size={40} style={{ color: '#475569', marginBottom: '12px', opacity: 0.3 }} />
                        <h3 style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 6px', fontWeight: 800, fontFamily: CAIRO }}>{t('لا توجد أقسام مطابقة')}</h3>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                        {filteredDepartments.map(dept => (
                            <div key={dept.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px', transition: 'all 0.23s' }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = `${C.primary}50`; e.currentTarget.style.background = C.hover; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.card; }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#f1f5f9', fontFamily: CAIRO }}>{dept.name}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                                            <div style={{ width: 24, height: 24, borderRadius: '6px', background: `${C.primary}10`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Users size={12} style={{ color: C.primary }} />
                                            </div>
                                            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 700, fontFamily: OUTFIT }}>{dept._count.employees} <span style={{ fontSize: '11px', fontFamily: CAIRO }}>{t('موظف')}</span></span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button onClick={() => openEditModal(dept)} style={{ ...TABLE_STYLE.actionBtn(), width: '32px', height: '32px' }} title={t("تعديل")}>
                                            <Pencil size={14} />
                                        </button>
                                        <button onClick={() => handleDelete(dept)} style={{ ...TABLE_STYLE.actionBtn(C.danger), width: '32px', height: '32px' }} title={t("حذف")}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div style={{ height: '4px', width: '100%', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${Math.min(dept._count.employees * 10, 100)}%`, background: `linear-gradient(90deg, ${C.primary}, #60a5fa)`, borderRadius: '10px' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* MODAL: Create/Edit Department */}
                <AppModal
                    show={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title={editDept ? t('تعديل القسم') : t('إضافة قسم جديد')}
                    icon={BuildingIcon}
                >
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={LS}>{t('اسم القسم')} *</label>
                            <input
                                type="text"
                                required
                                placeholder={t("مثال: قسم المبيعات...")}
                                style={IS}
                                onFocus={focusIn}
                                onBlur={focusOut}
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="submit" disabled={isSaving} style={{ ...BTN_PRIMARY(false, isSaving), flex: 1, height: '46px' }}>
                                {isSaving ? <Loader2 size={18} style={{ animation: 'spin 1.5s linear infinite' }} /> : <Save size={18} />}
                                <span style={{ marginInlineEnd: '8px' }}>{isSaving ? t('جاري الحفظ...') : (editDept ? t('تحديث البيانات') : t('حفظ القسم'))}</span>
                            </button>
                            <button type="button" onClick={() => setIsModalOpen(false)} style={{ height: '46px', padding: '0 20px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>
                                {t('إلغاء')}
                            </button>
                        </div>
                    </form>
                </AppModal>

                {/* MODAL: Delete Confirmation */}
                <AppModal
                    show={!!deptToDelete}
                    onClose={() => setDeptToDelete(null)}
                    isDelete={true}
                    title={t("تأكيد حذف القسم")}
                    itemName={deptToDelete?.name}
                    onConfirm={confirmDelete}
                    isSubmitting={isDeleting}
                />
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}} />
        </DashboardLayout>
    );
}


