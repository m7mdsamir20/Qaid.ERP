'use client';
import { formatNumber } from '@/lib/currency';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { Boxes, Package, PackageX, TrendingUp, AlertTriangle, Search, Pencil, Trash2, MapPin, Plus, Loader2, ShieldCheck, Printer, Check, X } from 'lucide-react';
import { THEME, C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut, PAGE_BASE, BTN_PRIMARY, SEARCH_STYLE, TABLE_STYLE, KPI_STYLE, KPI_ICON, STitle } from '@/constants/theme';
import { useCurrency } from '@/hooks/useCurrency';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import AppModal from '@/components/AppModal';
import Barcode from 'react-barcode';
import { useTranslation } from '@/lib/i18n';

interface Item {
    id: string;
    code: string;
    barcode?: string;
    imageUrl?: string;
    name: string;
    description?: string;
    costPrice: number;
    sellPrice: number;
    averageCost: number;
    categoryId: string;
    unitId: string;
    stocks: { warehouseId: string; quantity: number }[];
    category?: { name: string };
    unit?: { name: string };
    minLimit?: number;
    status: string;
}

export default function ItemsPage() {
    const { symbol: currencySymbol, fMoneyJSX } = useCurrency();
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const [items, setItems] = useState<Item[]>([]);
    const [warehouses, setWarehouses] = useState<{ id: string, name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [warehouseFilter, setWarehouseFilter] = useState('all');
    const [kpiFilter, setKpiFilter] = useState<'all' | 'low' | 'out'>('all');
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteItem, setDeleteItem] = useState<Item | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [isMounted, setIsMounted] = useState(false);
    const [companyBusinessType, setCompanyBusinessType] = useState('');
    const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
    const [unitsData, setUnitsData] = useState<{ id: string, name: string }[]>([]);
    const [showAddCat, setShowAddCat] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [showAddUnit, setShowAddUnit] = useState(false);
    const [newUnitName, setNewUnitName] = useState('');
    const [isSavingSub, setIsSavingSub] = useState(false);
    const [printBarcodeItem, setPrintBarcodeItem] = useState<Item | null>(null);
    const [barcodeCopies, setBarcodeCopies] = useState(1);
    const pageSize = 15;

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [iRes, wRes, cRes, uRes, setRes] = await Promise.all([
                fetch('/api/items?all=true'),
                fetch('/api/warehouses'),
                fetch('/api/categories'),
                fetch('/api/units'),
                fetch('/api/settings')
            ]);

            if (iRes.ok) {
                const data = await iRes.json();
                setItems(Array.isArray(data) ? data : (data.items || []));
            }
            if (wRes.ok) setWarehouses(await wRes.json());
            if (cRes.ok) setCategories(await cRes.json());
            if (uRes.ok) setUnitsData(await uRes.json());
            if (setRes.ok) {
                const sData = await setRes.json();
                setCompanyBusinessType(sData.company?.businessType?.toUpperCase() || '');
            }
        } catch (error) {
            console.error("Fetch Items Error:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const [form, setForm] = useState({
        id: '', code: '', barcode: '', imageUrl: '', name: '', description: '', categoryId: '', unitId: '', costPrice: 0, sellPrice: 0, minLimit: 0, warehouseId: '', initialQuantity: 0, status: 'active'
    });

    useEffect(() => {
        setIsMounted(true);
        fetchData();
    }, [fetchData]);

    const formatWithCommas = (val: string | number) => {
        if (val === undefined || val === null || val === '') return '';
        const s = val.toString().replace(/,/g, '');
        if (isNaN(Number(s))) return s;
        const [int, dec] = s.split('.');
        return int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (dec !== undefined ? '.' + dec : '');
    };

    const handleOpenModal = (item?: Item & { barcode?: string, imageUrl?: string }) => {
        if (item) {
            setForm({
                id: item.id, code: item.code, barcode: item.barcode || '', imageUrl: item.imageUrl || '', name: item.name, description: item.description || '', categoryId: item.categoryId || '',
                unitId: item.unitId || '', costPrice: item.costPrice, sellPrice: item.sellPrice,
                minLimit: item.minLimit || 0, warehouseId: '', initialQuantity: 0, status: item.status || 'active'
            });
            setEditingId(item.id);
        } else {
            let nextNum = 1;
            if (items.length > 0) {
                const nums = items.map(i => {
                    const match = i.code.match(/ITEM-(\d+)/);
                    return match ? parseInt(match[1]) : 0;
                });
                nextNum = Math.max(...nums, 0) + 1;
            }
            const nextCode = `ITEM-${String(nextNum).padStart(3, '0')}`;

            setForm({
                id: '', code: nextCode, barcode: '', imageUrl: '', name: '', description: '', categoryId: '',
                unitId: '', costPrice: 0, sellPrice: 0, minLimit: 0,
                warehouseId: localStorage.getItem('last_warehouse_id') || '',
                initialQuantity: 0, status: 'active'
            });
            setEditingId(null);
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const method = form.id ? 'PUT' : 'POST';
            const cleanForm = {
                ...form,
                costPrice: parseFloat(form.costPrice.toString().replace(/,/g, '')) || 0,
                sellPrice: parseFloat(form.sellPrice.toString().replace(/,/g, '')) || 0,
                minLimit: parseFloat(form.minLimit.toString().replace(/,/g, '')) || 0,
                initialQuantity: parseFloat(form.initialQuantity.toString().replace(/,/g, '')) || 0
            };

            const res = await fetch('/api/items', {
                method, headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cleanForm)
            });
            if (res.ok) {
                fetchData();
                setShowModal(false);
            } else {
                const errorData = await res.json();
                alert(t('فشل حفظ الصنف') + ': ' + (errorData.message || res.statusText));
            }
        } catch (err) {
            console.error(err);
            alert(t("An unexpected error occurred while saving the item."));
        }
        finally { setIsSubmitting(false); }
    };

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCatName.trim()) return;
        setIsSavingSub(true);
        try {
            const res = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newCatName })
            });
            if (res.ok) {
                const data = await res.json();
                setNewCatName('');
                setShowAddCat(false);
                await fetchData();
                setForm(prev => ({ ...prev, categoryId: data.id }));
            }
        } catch { } finally { setIsSavingSub(false); }
    };

    const handleCreateUnit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUnitName.trim()) return;
        setIsSavingSub(true);
        try {
            const res = await fetch('/api/units', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newUnitName })
            });
            if (res.ok) {
                const data = await res.json();
                setNewUnitName('');
                setShowAddUnit(false);
                await fetchData();
                setForm(prev => ({ ...prev, unitId: data.id }));
            }
        } catch { } finally { setIsSavingSub(false); }
    };

    const confirmDelete = async () => {
        if (!deleteItem) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/items?id=${deleteItem.id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchData();
                setDeleteItem(null);
            } else {
                const errorData = await res.json();
                alert(t('فشل الحذف') + ': ' + (errorData.error || errorData.message || res.statusText));
            }
        } catch (err) {
            console.error(err);
            alert(t("حدث خطأ غير متوقع أثناء محاولة حذف الصنف."));
        }
        finally { setIsSubmitting(false); }
    };

    const filteredAll = items.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.code.toLowerCase().includes(search.toLowerCase());
        if (!matchesSearch) return false;
        
        const totalQty = u.stocks?.reduce((q, st) => (warehouseFilter === 'all' || st.warehouseId === warehouseFilter) ? q + st.quantity : q, 0) || 0;
        
        if (warehouseFilter !== 'all') {
            const hasStockRecord = u.stocks?.some(s => s.warehouseId === warehouseFilter);
            if (kpiFilter === 'all' && !hasStockRecord && totalQty === 0) return false;
        }

        if (kpiFilter === 'low') return (u.minLimit || 0) > 0 && totalQty <= (u.minLimit || 0);
        if (kpiFilter === 'out') return totalQty === 0;
        return true;
    });

    const paginated = filteredAll.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    useEffect(() => { setCurrentPage(1); }, [search, warehouseFilter, kpiFilter]);

    const fmt = (num: number) => formatNumber(num);

    const itemsLowStock = items.filter(i => {
        const q = i.stocks?.reduce((sum, st) => (warehouseFilter === 'all' || st.warehouseId === warehouseFilter) ? sum + st.quantity : sum, 0) || 0;
        return (i.minLimit || 0) > 0 && q <= (i.minLimit || 0);
    }).length;
    const itemsOutOfStock = items.filter(i => {
        const q = i.stocks?.reduce((sum, st) => (warehouseFilter === 'all' || st.warehouseId === warehouseFilter) ? sum + st.quantity : sum, 0) || 0;
        return q === 0;
    }).length;
    
    const usesBarcode = ['SUPERMARKET', 'DISTRIBUTION', 'MANUFACTURING', 'MAINTENANCE', 'RESTAURANT'].includes(companyBusinessType);

    if (!isMounted) return null;

    return (
        <DashboardLayout>
            <div dir={isRtl ? "rtl" : "ltr"} style={{ ...PAGE_BASE, background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>
                <PageHeader
                    title={companyBusinessType === 'SERVICES' ? t("الخدمات") : t("الأصناف")}
                    subtitle={companyBusinessType === 'SERVICES' ? t("تعريف الخدمات التي تقدمها المؤسسة وتحديد أسعارها") : t("إدارة قائمة المنتجات، تكود الأصناف، ومتابعة الأسعار والمخزون في كافة الفروع")}
                    icon={companyBusinessType === 'SERVICES' ? Package : Boxes}
                    primaryButton={{
                        label: companyBusinessType === 'SERVICES' ? t("إضافة خدمة جديدة") : t("إضافة صنف جديد"),
                        onClick: () => handleOpenModal(),
                        icon: Plus
                    }}
                />

                {companyBusinessType?.toUpperCase() !== 'SERVICES' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
                        {[
                            { id: 'all', label: t('إجمالي الأصناف'), val: items.length, icon: Package, color: C.blue, unit: t('صنف') },
                            { id: 'out', label: t('أصناف نفدت'), val: itemsOutOfStock, icon: PackageX, color: C.danger, unit: t('صنف') },
                            { 
                                id: 'cost', 
                                label: t('إجمالي التكلفة'), 
                                val: items.reduce((s, i) => {
                                    const q = i.stocks?.reduce((sum, st) => (warehouseFilter === 'all' || st.warehouseId === warehouseFilter) ? sum + st.quantity : sum, 0) || 0;
                                    return s + (q * (i.costPrice || 0));
                                }, 0), 
                                icon: TrendingUp, 
                                color: C.teal, 
                                unit: currencySymbol 
                            },
                            { id: 'low', label: t('أصناف منخفضة'), val: itemsLowStock, icon: AlertTriangle, color: C.warning, unit: t('تنبيه') },
                        ].map((s, idx) => {
                            const isSelected = kpiFilter === s.id;
                            const isClickable = s.id === 'low' || s.id === 'out';
                            return (
                                <div key={idx}
                                    onClick={() => isClickable && setKpiFilter(prev => prev === s.id ? 'all' : s.id as any)}
                                    style={{
                                        background: isSelected ? `${s.color}15` : `${s.color}08`,
                                        border: `1px solid ${isSelected ? s.color : `${s.color}33`}`,
                                        borderRadius: '10px',
                                        padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        cursor: isClickable ? 'pointer' : 'default',
                                        transition: '0.2s',
                                        transform: isSelected ? 'translateY(-2px)' : 'none',
                                        boxShadow: isSelected ? `0 4px 15px ${s.color}20` : 'none'
                                    }}
                                >
                                    <div style={{ textAlign: 'start' }}>
                                        <p style={{ fontSize: '11px', fontWeight: 500, color: C.textMuted, margin: '0 0 4px', whiteSpace: 'nowrap' }}>{s.label}</p>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                            {s.id === 'value' ? fMoneyJSX(s.val) : (
                                                <>
                                                    <span style={{ fontSize: '18px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{fmt(s.val)}</span>
                                                    <span style={{ fontSize: '11px', color: C.textMuted, fontWeight: 500 }}>{s.unit}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{
                                        width: '38px', height: '38px', borderRadius: '10px',
                                        background: isSelected ? s.color : `${s.color}15`,
                                        border: `1px solid ${s.color}30`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: isSelected ? '#fff' : s.color,
                                        transition: '0.2s'
                                    }}>
                                        <s.icon size={18} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div style={{ ...SEARCH_STYLE.container, gap: '15px' }}>
                    <div style={SEARCH_STYLE.wrapper}>
                        <Search size={16} style={SEARCH_STYLE.icon(C.primary)} />
                        <input
                            placeholder={kpiFilter === 'low' ? t("البحث في الأصناف منخفضة المخزون...") : (kpiFilter === 'out' ? t("البحث في الأصناف التي نفدت...") : t("ابحث باسم الصنف أو كود المنتج..."))}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{
                                ...SEARCH_STYLE.input,
                                borderColor: kpiFilter !== 'all' ? (kpiFilter === 'low' ? C.warning : C.danger) : C.border,
                                borderRightWidth: kpiFilter !== 'all' ? (isRtl ? '3px' : '1px') : '1px',
                                borderLeftWidth: kpiFilter !== 'all' ? (!isRtl ? '3px' : '1px') : '1px'
                            }}
                            onFocus={focusIn} onBlur={focusOut}
                        />
                        {kpiFilter !== 'all' && (
                            <button onClick={() => setKpiFilter('all')}
                                style={{
                                    position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)',
                                    background: 'rgba(255,255,255,0.05)', border: 'none', color: C.textMuted,
                                    borderRadius: '4px', fontSize: '10px', padding: '2px 6px', cursor: 'pointer'
                                }}
                            >
                                {t("عرض الكل")} ✕
                            </button>
                        )}
                    </div>
                    {companyBusinessType?.toUpperCase() !== 'SERVICES' && (
                        <div style={{ width: '220px' }}>
                            <CustomSelect
                                value={warehouseFilter}
                                onChange={v => setWarehouseFilter(v)}
                                style={{ height: '42px', borderRadius: '10px' }}
                                options={[
                                    { value: 'all', label: t('جميع المخازن'), icon: MapPin },
                                    ...warehouses.map(w => ({ value: w.id, label: w.name, icon: MapPin }))
                                ]}
                            />
                        </div>
                    )}
                </div>

                {loading ? (
                    <div style={{ padding: '100px', color: C.textMuted }}>
                        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: C.primary, margin: '0 auto 16px' }} />
                        <p style={{ fontWeight: 600 }}>{t('جاري استخراج البيانات...')}</p>
                    </div>
                ) : filteredAll.length === 0 ? (
                    <div style={{ padding: '80px 20px', color: C.textMuted }}>
                        <Package size={56} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.1 }} />
                        <p style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>{search ? t('لا توجد نتائج بحث تطابق استفسارك') : (companyBusinessType === 'SERVICES' ? t('لا توجد خدمات مسجلة حالياً') : t('لا توجد أصناف مسجلة حالياً'))}</p>
                    </div>
                ) : (
                    <div style={TABLE_STYLE.container}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={{ ...TABLE_STYLE.th(true) }}>{t("الكود")}</th>
                                        {companyBusinessType !== 'SERVICES' && usesBarcode && <th style={{ ...TABLE_STYLE.th(false) }}>{t("الباركود")}</th>}
                                        <th style={{...TABLE_STYLE.th(false)}}>{companyBusinessType === 'SERVICES' ? t('الخدمة') : t('الصنف')}</th>
                                        {companyBusinessType !== 'SERVICES' && <th style={{...TABLE_STYLE.th(false, true)}}>{t("الكمية")}</th>}
                                        {companyBusinessType !== 'SERVICES' && <th style={{ ...TABLE_STYLE.th(false, true), }}>{t("سعر التكلفة")}</th>}
                                        <th style={{ ...TABLE_STYLE.th(false, true), }}>{companyBusinessType === 'SERVICES' ? t('سعر الخدمة') : t('سعر البيع')}</th>
                                        {companyBusinessType !== 'SERVICES' && <th style={{...TABLE_STYLE.th(false, true)}}>{t("متوسط التكلفة")}</th>}
                                        {companyBusinessType !== 'SERVICES' && <th style={{ ...TABLE_STYLE.th(false, true), }}>{t("إجمالي التكلفة")}</th>}
                                        <th style={{ ...TABLE_STYLE.th(false), textAlign: 'center' }}>{t("إجراء")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.map((item, idx) => {
                                        const totalQty = item.stocks?.reduce((s, st) => {
                                            if (warehouseFilter === 'all' || st.warehouseId === warehouseFilter) return s + st.quantity;
                                            return s;
                                        }, 0) || 0;
                                        const avgCost = item.averageCost || item.costPrice;
                                        const totalCost = totalQty * avgCost;
                                        return (
                                            <tr key={item.id} style={TABLE_STYLE.row(idx === paginated.length - 1)}>
                                                <td style={{...TABLE_STYLE.td(true), textAlign: 'start'}}><div style={{ color: C.primary, fontWeight: 600, fontFamily: OUTFIT, fontSize: '11px', opacity: 0.75 }}>{item.code}</div></td>
                                                {companyBusinessType !== 'SERVICES' && usesBarcode && (
                                                    <td style={{...TABLE_STYLE.td(false)}}><div style={{ fontWeight: 600, color: C.textSecondary, fontSize: '12px', fontFamily: OUTFIT, letterSpacing: '1px' }}>{item.barcode || '—'}</div></td>
                                                )}
                                                <td style={{...TABLE_STYLE.td(false)}}><div style={{ fontWeight: 700, color: C.textPrimary, fontSize: '13px', fontFamily: CAIRO }}>{item.name}</div></td>
                                                {companyBusinessType !== 'SERVICES' && (
                                                    <td style={{ ...TABLE_STYLE.td(false, true), fontFamily: OUTFIT, fontWeight: 600, color: C.textSecondary, }}>{fmt(totalQty)} <span style={{ fontSize: '10px', color: C.textMuted, fontFamily: CAIRO, fontWeight: 500 }}>{item.unit?.name || t('قطعة')}</span></td>
                                                )}
                                                {companyBusinessType !== 'SERVICES' && (
                                                    <td style={TABLE_STYLE.td(false, true)}>{fMoneyJSX(item.costPrice)}</td>
                                                )}
                                                <td style={TABLE_STYLE.td(false, true)}>{fMoneyJSX(item.sellPrice)}</td>
                                                {companyBusinessType !== 'SERVICES' && (
                                                    <td style={TABLE_STYLE.td(false, true)}>{fMoneyJSX(avgCost)}</td>
                                                )}
                                                {companyBusinessType !== 'SERVICES' && (
                                                    <td style={TABLE_STYLE.td(false, true)}>{fMoneyJSX(totalCost)}</td>
                                                )}
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                                                        {companyBusinessType !== 'SERVICES' && usesBarcode && (
                                                            <button onClick={() => { setPrintBarcodeItem(item); setBarcodeCopies(1); }} style={TABLE_STYLE.actionBtn(C.teal)} title={t("طباعة باركود")}>
                                                                <Printer size={TABLE_STYLE.actionIconSize} />
                                                            </button>
                                                        )}
                                                        <button onClick={() => handleOpenModal(item)} style={TABLE_STYLE.actionBtn()}><Pencil size={TABLE_STYLE.actionIconSize} /></button>
                                                        <button onClick={() => setDeleteItem(item)} style={TABLE_STYLE.actionBtn(C.danger)}><Trash2 size={TABLE_STYLE.actionIconSize} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <Pagination total={filteredAll.length} pageSize={pageSize} currentPage={currentPage} onPageChange={setCurrentPage} />
                        </div>
                    </div>
                )}

                <AppModal
                    show={showModal}
                    onClose={() => setShowModal(false)}
                    title={companyBusinessType === 'SERVICES' ? (form.id ? t('تعديل بيانات الخدمة') : t('إضافة خدمة جديدة')) : (form.id ? t('تعديل بيانات الصنف') : t('إضافة صنف جديد'))}
                    icon={form.id ? Pencil : Plus}
                    maxWidth="640px"
                >
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                        <div style={{ display: 'grid', gridTemplateColumns: (companyBusinessType === 'SERVICES' || !usesBarcode) ? '140px 1fr' : '120px 160px 1fr', gap: '14px' }}>
                            <div>
                                <label style={LS}>{companyBusinessType === 'SERVICES' ? t('كود الخدمة') : t('كود الصنف')}</label>
                                <div style={{ position: 'relative' }}>
                                    <input type="text" readOnly disabled value={form.code} style={{ ...IS, color: C.textSecondary, background: C.inputBg, borderStyle: 'dashed', paddingInlineStart: '32px' }} />
                                    <ShieldCheck size={13} style={{ position: 'absolute', insetInlineStart: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                                </div>
                            </div>

                            {companyBusinessType !== 'SERVICES' && usesBarcode && (
                                <div>
                                    <label style={LS}>{t('الباركود الإضافي')}</label>
                                    <input type="text" placeholder={t("سكان الباركود...")} value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} style={{ ...IS, fontFamily: OUTFIT, fontWeight: 600, direction: 'ltr' }} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                            )}

                            <div>
                                <label style={LS}>{companyBusinessType === 'SERVICES' ? t('اسم الخدمة') : t('اسم الصنف')} <span style={{ color: C.danger }}>*</span></label>
                                <input type="text" required autoFocus placeholder={companyBusinessType === 'SERVICES' ? t("مثال: استشارة قانونية") : (usesBarcode ? t("مثال: زيت موتر 5 لتر") : t("اسم المنتج"))} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={IS} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                            <div>
                                <label style={LS}>{companyBusinessType === 'SERVICES' ? t('تصنيف الخدمة') : t('التصنيف')}</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <div style={{ flex: 1 }}>
                                        <CustomSelect value={form.categoryId} onChange={v => setForm({ ...form, categoryId: v })} placeholder={t("اختر التصنيف...")} maxHeight="165px" options={categories.map(c => ({ value: c.id, label: c.name, icon: Boxes }))} />
                                    </div>
                                    <button type="button" onClick={() => setShowAddCat(true)}
                                        style={{ background: C.inputBg, border: `1px solid ${C.border}`, color: C.textSecondary, width: '42px', height: '42px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                                        onMouseLeave={e => e.currentTarget.style.background = C.inputBg}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                            {companyBusinessType === 'SERVICES' ? (
                                <div>
                                    <label style={LS}>{t('حالة الخدمة')}</label>
                                    <CustomSelect
                                        value={form.status}
                                        onChange={v => setForm({ ...form, status: v })}
                                        options={[
                                            { value: 'active', label: t('نشط'), icon: Check },
                                            { value: 'inactive', label: t('غير نشط'), icon: X }
                                        ]}
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label style={LS}>{t('وحدة القياس')}</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <div style={{ flex: 1 }}>
                                            <CustomSelect value={form.unitId} onChange={v => setForm({ ...form, unitId: v })} placeholder={t("قطعة، كرتونة...")} maxHeight="165px" options={unitsData.map(u => ({ value: u.id, label: u.name, icon: Package }))} />
                                        </div>
                                        <button type="button" onClick={() => setShowAddUnit(true)}
                                            style={{ background: C.inputBg, border: `1px solid ${C.border}`, color: C.textSecondary, width: '42px', height: '42px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                                            onMouseLeave={e => e.currentTarget.style.background = C.inputBg}
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {companyBusinessType === 'SERVICES' ? (
                            <div>
                                <label style={LS}>{t('وصف الخدمة')}</label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    placeholder={t("اكتب تفاصيل الخدمة هنا ليتم سحبها في الفاتورة...")}
                                    style={{ ...IS, height: '100px', padding: '10px', resize: 'none' }}
                                    onFocus={focusIn} onBlur={focusOut}
                                />
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={LS}>{t('سعر التكلفة')}</label>
                                        <div style={{ position: 'relative' }}>
                                            <input type="text" inputMode="decimal" placeholder="0.00" value={formatWithCommas(form.costPrice === 0 ? '' : form.costPrice)} onChange={e => setForm({ ...form, costPrice: e.target.value.replace(/[^0-9.]/g, '') as any })} style={{ ...IS, paddingInlineStart: '34px', fontFamily: OUTFIT, fontWeight: 700 }} onFocus={focusIn} onBlur={focusOut} />
                                            <span style={{ position: 'absolute', insetInlineStart: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: C.textMuted, fontWeight: 700 }}>{currencySymbol}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={LS}>{t('سعر البيع')}</label>
                                        <div style={{ position: 'relative' }}>
                                            <input type="text" inputMode="decimal" placeholder="0.00" value={formatWithCommas(form.sellPrice === 0 ? '' : form.sellPrice)} onChange={e => setForm({ ...form, sellPrice: e.target.value.replace(/[^0-9.]/g, '') as any })} style={{ ...IS, paddingInlineStart: '34px', fontFamily: OUTFIT, fontWeight: 700 }} onFocus={focusIn} onBlur={focusOut} />
                                            <span style={{ position: 'absolute', insetInlineStart: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: C.textMuted, fontWeight: 700 }}>{currencySymbol}</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={LS}>{t('حد الطلب')} <span style={{ color: C.textMuted, fontWeight: 500 }}>({t('تنبيه نقص المخزون')})</span></label>
                                        <div style={{ position: 'relative', background: C.inputBg, borderRadius: THEME.input.radius, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                                            {!form.minLimit && (
                                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', pointerEvents: 'none', fontFamily: OUTFIT }}>
                                                    0
                                                </div>
                                            )}
                                            <input type="text" inputMode="decimal" value={form.minLimit === 0 ? '' : form.minLimit} onChange={e => setForm({ ...form, minLimit: e.target.value.replace(/[^0-9.]/g, '') as any })} style={{ ...IS, border: 'none', background: 'transparent', fontFamily: CAIRO, fontWeight: 600 }} onFocus={focusIn} onBlur={focusOut} />
                                            <AlertTriangle size={12} style={{ position: 'absolute', insetInlineStart: '12px', top: '50%', transform: 'translateY(-50%)', color: C.warning, opacity: 0.6 }} />
                                        </div>
                                    </div>
                                </div>

                                {!form.id && (
                                    <div style={{ padding: '10px 14px', borderRadius: '12px', background: 'rgba(37, 106, 244,0.03)', border: `1px solid rgba(37, 106, 244,0.15)`, marginTop: '0px' }}>
                                        <div style={{ ...STitle, marginBottom: '6px', color: C.primary }}><MapPin size={14} /> {t('الرصيد الافتتاحي')}</div>
                                        <p style={{ fontSize: '10px', color: C.textMuted, margin: '0 0 6px', fontWeight: 500 }}>{t('اختياري — يمكن إضافة الكمية لاحقاً من فاتورة مشتريات')}</p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                            <div>
                                                <label style={LS}>{t('المخزن')} {form.initialQuantity > 0 && !form.warehouseId && <span style={{ color: C.danger, marginInlineStart: '6px' }}>* {t('مطلوب')}</span>}</label>
                                                <CustomSelect value={form.warehouseId} onChange={v => { setForm({ ...form, warehouseId: v }); localStorage.setItem('last_warehouse_id', v); }} openUp={true} hideSearch={true} placeholder={t("اختر المخزن...")} options={warehouses.map(w => ({ value: w.id, label: w.name, icon: MapPin }))} />
                                            </div>
                                            <div>
                                                <label style={LS}>{t('الكمية الافتتاحية')}</label>
                                                <div style={{ position: 'relative', background: C.inputBg, borderRadius: THEME.input.radius, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                                                    {!form.initialQuantity && (
                                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', pointerEvents: 'none', fontFamily: OUTFIT }}>
                                                            0
                                                        </div>
                                                    )}
                                                    <input type="text" inputMode="decimal" value={form.initialQuantity === 0 ? '' : form.initialQuantity} onChange={e => setForm({ ...form, initialQuantity: e.target.value.replace(/[^0-9.]/g, '') as any })} style={{ ...IS, border: 'none', background: 'transparent', fontFamily: CAIRO, fontWeight: 600 }} onFocus={focusIn} onBlur={focusOut} />
                                                </div>
                                            </div>
                                        </div>
                                        {form.initialQuantity > 0 && form.costPrice > 0 && (
                                            <div style={{ marginTop: '8px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(37, 106, 244,0.08)', fontSize: '11px', color: C.primary, fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                                                <span>{t('القيمة الإجمالية للمخزون')}</span>
                                                <span style={{ fontFamily: OUTFIT }}>{(form.initialQuantity * form.costPrice).toLocaleString()} <span style={{ fontFamily: CAIRO }}>{currencySymbol}</span></span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        <div style={{ display: 'flex', gap: '12px', borderTop: `1px solid ${C.border}`, paddingTop: '10px', marginTop: '0px' }}>
                            <button type="submit" disabled={isSubmitting || (companyBusinessType !== 'SERVICES' && form.initialQuantity > 0 && !form.warehouseId)} style={{ flex: 1, height: '44px', borderRadius: '10px', border: 'none', background: (isSubmitting || (companyBusinessType !== 'SERVICES' && form.initialQuantity > 0 && !form.warehouseId)) ? 'rgba(37, 106, 244,0.3)' : 'linear-gradient(135deg,#256af4,#256af4)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: CAIRO }}>
                                {isSubmitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : (companyBusinessType === 'SERVICES' ? (form.id ? t('حفظ الخدمة') : t('إضافة الخدمة')) : (form.id ? t('حفظ التعديلات') : t('إضافة الصنف')))}
                            </button>
                            <button type="button" onClick={() => setShowModal(false)} style={{ width: '100px', height: '44px', borderRadius: '10px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>{t('تراجع')}</button>
                        </div>
                    </form>
                </AppModal>

                <AppModal show={!!deleteItem} onClose={() => setDeleteItem(null)} isDelete={true} title={t("تأكيد حذف الصنف")} itemName={deleteItem?.name} onConfirm={confirmDelete} isSubmitting={isSubmitting} />

                <AppModal show={!!printBarcodeItem} onClose={() => setPrintBarcodeItem(null)} title={t("طباعة باركود الصنف")} icon={Printer} maxWidth="360px">
                    {printBarcodeItem && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
                            <div id="barcode-svg-container" style={{ display: 'none' }}>
                                <Barcode value={printBarcodeItem.barcode || printBarcodeItem.code} width={1.5} height={40} fontSize={12} displayValue={true} background="transparent" margin={0} />
                            </div>

                            <div style={{ background: '#fff', padding: '20px 15px', borderRadius: '16px', boxShadow: `0 8px 30px rgba(0,0,0,0.15)`, border: `1px solid ${C.border}` }}>
                                <Barcode value={printBarcodeItem.barcode || printBarcodeItem.code} width={1.8} height={50} fontSize={14} displayValue={true} background="#fff" margin={0} />
                            </div>

                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ ...LS }}>{t('عدد النسخ المراد طباعتها')}</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button onClick={() => setBarcodeCopies(c => Math.max(1, c - 1))} style={{ width: '48px', height: '48px', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.inputBg, color: C.textPrimary, cursor: 'pointer', fontSize: '24px', fontWeight: 'bold' }}>-</button>
                                    <input type="number" value={barcodeCopies} onChange={e => setBarcodeCopies(parseInt(e.target.value) || 1)} style={{ ...IS, height: '48px', flex: 1, fontSize: '18px', fontWeight: 'bold' }} />
                                    <button onClick={() => setBarcodeCopies(c => c + 1)} style={{ width: '48px', height: '48px', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.inputBg, color: C.textPrimary, cursor: 'pointer', fontSize: '24px', fontWeight: 'bold' }}>+</button>
                                </div>
                            </div>

                            <button onClick={() => {
                                const printWindow = window.open('', '_blank');
                                if (!printWindow) return;
                                const svgContainer = document.getElementById('barcode-svg-container');
                                const svgElement = svgContainer ? svgContainer.innerHTML : '';
                                const barcodeName = printBarcodeItem.name;

                                let htmlString = `<!DOCTYPE html><html dir="${isRtl ? 'rtl' : 'ltr'}"><head><title>${t('طباعة باركود')}</title>`;
                                htmlString += `<style>@page { margin: 0; size: auto; } body { margin: 0; padding: 10px; display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; font-family: sans-serif; }`;
                                htmlString += `.barcode-ticket { width: 38mm; height: 25mm; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; overflow: hidden; page-break-inside: avoid; }`;
                                htmlString += `.barcode-name { font-size: 10px; font-weight: bold; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; direction: rtl; }`;
                                htmlString += `svg { max-width: 100%; height: auto; }</style></head>`;
                                htmlString += `<body onload="setTimeout(() => { window.print(); window.close(); }, 300)">`;

                                for (let i = 0; i < barcodeCopies; i++) {
                                    htmlString += '<div class="barcode-ticket">';
                                    htmlString += '<div class="barcode-name">' + barcodeName + '</div>';
                                    htmlString += svgElement || '';
                                    htmlString += '</div>';
                                }

                                htmlString += '</body></html>';

                                printWindow.document.write(htmlString);
                                printWindow.document.close();
                            }} style={{ ...BTN_PRIMARY(false, false), width: '100%', height: '48px', marginTop: '10px' }}>
                                <Printer size={20} style={{ marginInlineStart: '10px' }} />
                                {t('طباعة الباركود')}
                            </button>
                        </div>
                    )}
                </AppModal>

                <AppModal show={showAddCat} onClose={() => setShowAddCat(false)} title={t("إضافة تصنيف جديد")} icon={Boxes} maxWidth="400px">
                    <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={LS}>{t('اسم التصنيف الجديد')}</label>
                            <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder={t("مثال: زيوت، فلاتر...")} style={IS} autoFocus onFocus={focusIn} onBlur={focusOut} />
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="submit" disabled={isSavingSub} style={{ ...BTN_PRIMARY(!newCatName.trim(), isSavingSub), flex: 1, height: '44px' }}>
                                {isSavingSub ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : t('حفظ التصنيف')}
                            </button>
                            <button type="button" onClick={() => setShowAddCat(false)} style={{ border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, borderRadius: '10px', padding: '0 20px', cursor: 'pointer', fontFamily: CAIRO }}>{t('إلغاء')}</button>
                        </div>
                    </form>
                </AppModal>

                <AppModal show={showAddUnit} onClose={() => setShowAddUnit(false)} title={t("إضافة وحدة قياس جديدة")} icon={Package} maxWidth="400px">
                    <form onSubmit={handleCreateUnit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={LS}>{t('اسم الوحدة الجديدة')}</label>
                            <input type="text" value={newUnitName} onChange={e => setNewUnitName(e.target.value)} placeholder={t("مثال: لتر، جالون، طقم...")} style={IS} autoFocus onFocus={focusIn} onBlur={focusOut} />
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="submit" disabled={isSavingSub} style={{ ...BTN_PRIMARY(!newUnitName.trim(), isSavingSub), flex: 1, height: '44px' }}>
                                {isSavingSub ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : t('حفظ الوحدة')}
                            </button>
                            <button type="button" onClick={() => setShowAddUnit(false)} style={{ border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, borderRadius: '10px', padding: '0 20px', cursor: 'pointer', fontFamily: CAIRO }}>{t('إلغاء')}</button>
                        </div>
                    </form>
                </AppModal>
            </div>
            <style jsx global>{` @keyframes spin { to { transform:rotate(360deg); } } `}</style>
        </DashboardLayout>
    );
}
