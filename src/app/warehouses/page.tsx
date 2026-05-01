'use client';
import { formatNumber } from '@/lib/currency';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { Warehouse, Plus, Trash2, Search, Pencil, Loader2, MapPin, Building2, Boxes, ShieldCheck, AlertTriangle } from 'lucide-react';
import { C, CAIRO, OUTFIT, PAGE_BASE, BTN_PRIMARY, SEARCH_STYLE, TABLE_STYLE, focusIn, focusOut, LS, IS } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import AppModal from '@/components/AppModal';

interface WarehouseItem {
    id: string;
    code: string | null;
    name: string;
    address: string | null;
    createdAt: string;
    _count: { stocks: number };
}

export default function WarehousesPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [search, setSearch] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteItem, setDeleteItem] = useState<WarehouseItem | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;
    
    const [form, setForm] = useState({ name: '', address: '', code: '' });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/warehouses');
            if (res.ok) setWarehouses(await res.json());
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleOpenModal = (w?: WarehouseItem) => {
        if (w) {
            setEditingId(w.id);
            setForm({ name: w.name, address: w.address || '', code: w.code || '' });
        } else {
            let maxId = 0;
            warehouses.forEach(wh => {
                if (wh.code?.startsWith('WH-')) {
                    const n = parseInt(wh.code.replace('WH-', ''));
                    if (!isNaN(n) && n > maxId) maxId = n;
                }
            });
            setEditingId(null);
            setForm({ name: '', address: '', code: `WH-${String(maxId + 1).padStart(3, '0')}` });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/warehouses', {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingId ? { id: editingId, ...form } : form),
            });
            if (res.ok) {
                setShowModal(false);
                setForm({ name: '', address: '', code: '' });
                setEditingId(null);
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || t('فشل في الحفظ'));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteItem) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/warehouses?id=${encodeURIComponent(deleteItem.id)}`, { 
                method: 'DELETE'
            });
            
            if (res.ok) {
                setDeleteItem(null);
                await fetchData();
            } else {
                const data = await res.json().catch(() => ({ error: t('فشل في الحذف') }));
                alert(data.error || t('فشل في الحذف'));
            }
        } catch (err: any) {
            alert(t('حدث خطأ في الاتصال: ') + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredAll = useMemo(() => {
        return warehouses.filter(w =>
            w.name.toLowerCase().includes(search.toLowerCase()) ||
            (w.code || '').toLowerCase().includes(search.toLowerCase()) ||
            (w.address || '').toLowerCase().includes(search.toLowerCase())
        );
    }, [warehouses, search]);

    const paginated = useMemo(() => {
        return filteredAll.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    }, [filteredAll, currentPage]);

    useEffect(() => { setCurrentPage(1); }, [search]);

    const fmt = (num: number) => formatNumber(num);

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ ...PAGE_BASE, background: C.bg, minHeight: '100vh', fontFamily: CAIRO }}>
                
                <PageHeader 
                    title={t("المخازن")} 
                    subtitle={t("إدارة مواقع التخزين، الفروع، وتوزيع الكميات الجردية")} 
                    icon={Warehouse} 
                    primaryButton={{
                        label: t("إضافة مخزن جديد"),
                        onClick: () => handleOpenModal(),
                        icon: Plus
                    }}
                />

                {/* Search Bar */}
                <div className="mobile-column" style={{ ...SEARCH_STYLE.container, alignItems: 'stretch' }}>
                    <div style={SEARCH_STYLE.wrapper}>
                        <Search size={16} style={SEARCH_STYLE.icon(C.primary)} />
                        <input
                            placeholder={t("ابحث باسم المخزن، الكود، أو العنوان...")}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={SEARCH_STYLE.input}
                            onFocus={focusIn} onBlur={focusOut}
                        />
                    </div>
                </div>

                {/* Table Content */}
                {loading ? (
                    <div style={{  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px', color: C.textSecondary }}>
                        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: C.primary, margin: '0 auto 16px' }} />
                        <p style={{ fontWeight: 600 }}>{t('جاري تحميل قائمة المخازن...')}</p>
                    </div>
                ) : filteredAll.length === 0 ? (
                    <div style={{  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', color: C.textSecondary }}>
                        <Warehouse size={56} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.1 }} />
                        <p style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>{search ? t('لا توجد نتائج بحث تطابق استفسارك') : t('لا توجد مخازن مسجلة حالياً')}</p>
                    </div>
                ) : (
                    <div style={TABLE_STYLE.container}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={{ ...TABLE_STYLE.th(true) }}>{t('الكود')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false) }}>{t('اسم المخزن')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false, true) }}>{t('العنوان')}</th>
                                        <th style={TABLE_STYLE.th(false, true)}>{t('عدد الأصناف')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false), textAlign: 'center' }}>{t('إجراء')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.map((wh, idx) => (
                                        <tr key={wh.id} 
                                            style={TABLE_STYLE.row(idx === paginated.length - 1)}
                                            onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={TABLE_STYLE.td(true)}>
                                                <div style={{ color: C.primary, fontWeight: 600, fontFamily: OUTFIT, fontSize: '11px', opacity: 0.75 }}>
                                                    {wh.code || '—'}
                                                </div>
                                            </td>
                                            <td style={TABLE_STYLE.td(false)}>
                                                <div style={{ fontWeight: 600, color: C.textPrimary, fontSize: '13px' }}>{wh.name}</div>
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false, true) }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: C.textSecondary, fontSize: '13px' }}>
                                                    <MapPin size={14} style={{ opacity: 0.6 }} />
                                                    {wh.address || t('غير محدد')}
                                                </div>
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false, true), fontFamily: OUTFIT, fontWeight: 600, color: C.purple, }}>
                                                {wh._count.stocks} <span style={{ fontSize: '10px', color: C.textSecondary, fontFamily: CAIRO, fontWeight: 500 }}>{t('أصناف')}</span>
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                                                    <button onClick={() => handleOpenModal(wh)}
                                                        style={TABLE_STYLE.actionBtn()}
                                                        title={t("تعديل")}
                                                    >
                                                        <Pencil size={TABLE_STYLE.actionIconSize} />
                                                    </button>
                                                    <button onClick={() => setDeleteItem(wh)}
                                                        style={TABLE_STYLE.actionBtn(C.danger)}
                                                        title={t("حذف")}
                                                    >
                                                        <Trash2 size={TABLE_STYLE.actionIconSize} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <Pagination 
                                total={filteredAll.length}
                                pageSize={pageSize}
                                currentPage={currentPage}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    </div>
                )}

                {/* Form Modal */}
                <AppModal
                    show={showModal}
                    onClose={() => setShowModal(false)}
                    title={editingId ? t('تعديل بيانات المخزن') : t('إنشاء مخزن جديد')}
                    icon={Warehouse}
                    maxWidth="550px"
                >
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '16px' }}>
                            <div>
                                <label style={LS}>{t('كود المخزن النظامي')}</label>
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        type="text" readOnly disabled value={form.code} 
                                        style={{ ...IS, height: '42px', paddingInlineStart: '32px', color: C.textSecondary, background: 'rgba(255,255,255,0.03)', borderStyle: 'dashed' }} 
                                    />
                                    <ShieldCheck size={14} style={{ position: 'absolute', insetInlineStart: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                                </div>
                            </div>
                            <div>
                                <label style={LS}>{t('اسم المخزن')} <span style={{ color: C.danger }}>*</span></label>
                                <input 
                                    type="text" required autoFocus 
                                    placeholder={t("مثال: المخزن الرئيسي، فرع الجيزة...")} 
                                    value={form.name} 
                                    onChange={e => setForm({ ...form, name: e.target.value })} 
                                    style={{ ...IS, height: '42px' }} 
                                    onFocus={focusIn} onBlur={focusOut} 
                                />
                            </div>
                        </div>

                        <div>
                            <label style={LS}>{t('العنوان التفصيلي')}</label>
                            <div style={{ position: 'relative' }}>
                                <input 
                                    type="text" 
                                    placeholder={t("أدخل عنوان المخزن بالتفصيل...")} 
                                    value={form.address} 
                                    onChange={e => setForm({ ...form, address: e.target.value })} 
                                    style={{ ...IS, height: '42px', paddingInlineEnd: '40px' }} 
                                    onFocus={focusIn} onBlur={focusOut} 
                                />
                                <MapPin size={16} style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', color: C.blue, opacity: 0.8 }} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '12px', marginTop: '10px', borderTop: `1px solid ${C.border}`, paddingTop: '20px' }}>
                            <button type="submit" disabled={isSubmitting} style={{ ...BTN_PRIMARY(false, isSubmitting), height: '48px' }}>
                                {isSubmitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : editingId ? t('تعديل المخزن') : t('تأكيد الإضافة')}
                            </button>
                            <button type="button" onClick={() => setShowModal(false)} style={{ borderRadius: '12px', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.03)', color: C.textSecondary, fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>{t('إلغاء')}</button>
                        </div>
                    </form>
                </AppModal>

                {/* نافذة تأكيد الحذف العامة */}
                <AppModal
                    show={!!deleteItem}
                    onClose={() => setDeleteItem(null)}
                    onConfirm={confirmDelete}
                    title={t("تأكيد حذف المخزن")}
                    itemName={deleteItem?.name || ''}
                    isDelete={true}
                    isSubmitting={isSubmitting}
                />

            </div>
            <style jsx global>{` @keyframes spin { to { transform:rotate(360deg); } } `}</style>
        </DashboardLayout>

    );
}

