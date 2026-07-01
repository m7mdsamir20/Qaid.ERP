'use client';
import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import { C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut, PAGE_BASE, TABLE_STYLE, BTN_PRIMARY } from '@/constants/theme';
import { Wrench, Plus, Pencil, Trash2, Loader2, Search, ShieldCheck } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import Pagination from '@/components/Pagination';

interface ServiceItem {
    id: string;
    code: string;
    name: string;
    description: string | null;
    isActive: boolean;
}

const EMPTY: ServiceItem = { id: '', code: '', name: '', description: '', isActive: true };

export default function ServiceCatalogPage() {
    const { t } = useTranslation();
    const [items, setItems] = useState<ServiceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<Omit<ServiceItem, 'code'> & { code?: string }>({ ...EMPTY });
    const [submitting, setSubmitting] = useState(false);
    const [deleteItem, setDeleteItem] = useState<ServiceItem | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;

    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/service-catalog');
            if (res.ok) setItems(await res.json());
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    const openAdd = () => { setForm({ ...EMPTY }); setShowModal(true); };
    const openEdit = (item: ServiceItem) => { setForm({ ...item }); setShowModal(true); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const isEdit = !!form.id;
            const url = isEdit ? `/api/service-catalog/${form.id}` : '/api/service-catalog';
            const method = isEdit ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: form.name, description: form.description, isActive: form.isActive }),
            });
            if (res.ok) { setShowModal(false); fetchItems(); }
        } finally { setSubmitting(false); }
    };

    const handleDelete = async () => {
        if (!deleteItem) return;
        await fetch(`/api/service-catalog/${deleteItem.id}`, { method: 'DELETE' });
        setDeleteItem(null);
        fetchItems();
    };

    const filtered = items.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.code.toLowerCase().includes(search.toLowerCase())
    );
    const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <DashboardLayout>
            <div dir="rtl" style={{ ...PAGE_BASE, fontFamily: CAIRO }}>
                <PageHeader
                    title={t("كتالوج الخدمات")}
                    subtitle={t("تعريف الخدمات التي تقدمها المؤسسة وتحديد أسعارها")}
                    icon={Wrench}
                    primaryButton={{ label: t("إضافة خدمة جديدة"), onClick: openAdd, icon: Plus }}
                />

                {/* Search */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '0 14px', marginBottom: '16px', height: '44px' }}>
                    <Search size={16} color={C.textMuted} />
                    <input
                        value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                        placeholder={t("ابحث باسم الخدمة أو الكود...")}
                        style={{ flex: 1, border: 'none', background: 'transparent', color: C.textPrimary, fontSize: '13px', fontFamily: CAIRO, outline: 'none' }}
                    />
                </div>

                {/* Table */}
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
                        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: C.primary }} />
                    </div>
                ) : (
                    <div style={TABLE_STYLE.container}>
                        <table style={{ ...TABLE_STYLE.table, minWidth: '600px' }}>
                            <thead style={TABLE_STYLE.thead}>
                                <tr>
                                    {[t('الكود'), t('الخدمة'), t('الحالة'), t('إجراء')].map((h, i) => (
                                        <th key={i} style={TABLE_STYLE.th(i === 0, i >= 2)}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.length === 0 ? (
                                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '60px', color: C.textMuted, fontSize: '13px' }}>{t('لا توجد خدمات مضافة بعد')}</td></tr>
                                ) : paginated.map((item, idx) => (
                                    <tr key={item.id} style={TABLE_STYLE.row(idx === paginated.length - 1)}
                                        onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                        <td style={TABLE_STYLE.td(true)}>
                                            <span style={{ color: C.primary, fontWeight: 600, fontFamily: OUTFIT, fontSize: '11px' }}>{item.code}</span>
                                        </td>
                                        <td style={TABLE_STYLE.td(false)}>
                                            <div style={{ fontWeight: 600, color: C.textPrimary }}>{item.name}</div>
                                            {item.description && <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px' }}>{item.description}</div>}
                                        </td>
                                        <td style={TABLE_STYLE.td(false, true)}>
                                            <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: item.isActive ? 'rgba(74,222,128,0.12)' : 'rgba(239,68,68,0.1)', color: item.isActive ? '#4ade80' : '#ef4444', border: `1px solid ${item.isActive ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                                                {item.isActive ? t('نشط') : t('غير نشط')}
                                            </span>
                                        </td>
                                        <td style={TABLE_STYLE.td(false, true)}>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                <button onClick={() => openEdit(item)} style={TABLE_STYLE.actionBtn(C.primary)}><Pencil size={TABLE_STYLE.actionIconSize} /></button>
                                                <button onClick={() => setDeleteItem(item)} style={TABLE_STYLE.actionBtn(C.danger)}><Trash2 size={TABLE_STYLE.actionIconSize} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={pageSize} onPageChange={setCurrentPage} />

                {/* Add/Edit Modal */}
                <AppModal show={showModal} onClose={() => setShowModal(false)} title={form.id ? t('تعديل بيانات الخدمة') : t('إضافة خدمة جديدة')} icon={form.id ? Pencil : Plus} maxWidth="520px">
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {form.id && (
                            <div>
                                <label style={LS}>{t('كود الخدمة')}</label>
                                <div style={{ position: 'relative' }}>
                                    <input readOnly disabled value={form.code || ''} style={{ ...IS, color: C.textSecondary, background: C.inputBg, borderStyle: 'dashed', paddingInlineStart: '32px' }} />
                                    <ShieldCheck size={13} style={{ position: 'absolute', insetInlineStart: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                                </div>
                            </div>
                        )}
                        <div>
                            <label style={LS}>{t('اسم الخدمة')} <span style={{ color: C.danger }}>*</span></label>
                            <input required autoFocus type="text" placeholder={t("مثال: صيانة مكيف، استشارة قانونية...")} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={IS} onFocus={focusIn} onBlur={focusOut} />
                        </div>
                        <div>
                            <label style={LS}>{t('الوصف')} <span style={{ fontSize: '10px', color: C.textMuted }}>({t('اختياري')})</span></label>
                            <textarea rows={2} placeholder={t("وصف مختصر للخدمة...")} value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ ...IS, resize: 'vertical', minHeight: '60px' }} onFocus={focusIn} onBlur={focusOut} />
                        </div>
                        {form.id && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                                <label htmlFor="isActive" style={{ ...LS, margin: 0, cursor: 'pointer' }}>{t('الخدمة نشطة')}</label>
                            </div>
                        )}
                        <button type="submit" disabled={submitting} style={{ ...BTN_PRIMARY(false, false), height: '46px', borderRadius: '12px', marginTop: '4px' }}>
                            {submitting ? t('جاري الحفظ...') : form.id ? t('حفظ التعديلات') : t('إضافة الخدمة')}
                        </button>
                    </form>
                </AppModal>

                {/* Delete Confirm */}
                <AppModal show={!!deleteItem} onClose={() => setDeleteItem(null)} title={t('حذف الخدمة')} icon={Trash2} maxWidth="400px">
                    <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
                        <p style={{ color: C.textSecondary, fontSize: '14px', marginBottom: '20px' }}>{t('هل أنت متأكد من حذف خدمة')} <strong style={{ color: C.textPrimary }}>{deleteItem?.name}</strong>؟</p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={handleDelete} style={{ flex: 1, height: '42px', borderRadius: '10px', border: 'none', background: C.danger, color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>{t('نعم، احذف')}</button>
                            <button onClick={() => setDeleteItem(null)} style={{ flex: 1, height: '42px', borderRadius: '10px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO }}>{t('إلغاء')}</button>
                        </div>
                    </div>
                </AppModal>

                <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </DashboardLayout>
    );
}
