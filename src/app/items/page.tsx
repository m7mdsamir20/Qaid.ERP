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
                fetch('/api/items?all=true'), // âœ… Essential: Get all items to prevent KPI filter crash
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
                alert(t('ظپط´ظ„ ط­ظپط¸ ط§ظ„صنف') + ': ' + (errorData.message || res.statusText));
            }
        } catch (err) {
            console.error(err);
            alert(t("An unexpected error occurred while saving the item"));
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
            alert(t("حدث خطأ غير متوقع أثناء محاولة حذف الصنف"));
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
    const totalQuantity = items.reduce((s, i) => s + (i.stocks?.reduce((q, st) => (warehouseFilter === 'all' || st.warehouseId === warehouseFilter) ? q + st.quantity : q, 0) || 0), 0);

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
                            placeholder={kpiFilter === 'low' ? t("ط§ظ„ط¨ط­ط« ظپظٹ الأصناف ظ…ظ†ط®ظپط¶ط© ط§ظ„ظ…ط®ط²ظˆظ†...") : (kpiFilter === 'out' ? t("ط§ظ„ط¨ط­ط« ظپظٹ الأصناف ط§ظ„طھظٹ ظ†ظپط¯طھ...") : t("ط§ط¨ط­ط« ط¨ط§ط³ظ… ط§ظ„صنف ط£ظˆ ظƒظˆط¯ ط§ظ„ظ…ظ†طھط¬..."))}
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
                                {t("ط¹ط±ط¶ ط§ظ„ظƒظ„")} âœ•
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
                                    { value: 'all', label: t('ط¬ظ…ظٹط¹ ط§ظ„ظ…ط®ط§ط²ظ†'), icon: MapPin },
                                    ...warehouses.map(w => ({ value: w.id, label: w.name, icon: MapPin }))
                                ]}
                            />
                        </div>
                    )}
                </div>

                {loading ? (
                    <div style={{ padding: '100px', color: C.textMuted }}>
                        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: C.primary, margin: '0 auto 16px' }} />
                        <p style={{ fontWeight: 600 }}>{t('ط¬ط§ط±ظٹ ط§ط³طھط®ط±ط§ط¬ ط§ظ„ط¨ظٹط§ظ†ط§طھ...')}</p>
                    </div>
                ) : filteredAll.length === 0 ? (
                    <div style={{ padding: '80px 20px', color: C.textMuted }}>
                        <Package size={56} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.1 }} />
                        <p style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>{search ? t('ظ„ط§ طھظˆط¬ط¯ ظ†طھط§ط¦ط¬ ط¨ط­ط« طھط·ط§ط¨ظ‚ ط§ط³طھظپط³ط§ط±ظƒ') : (companyBusinessType === 'SERVICES' ? t('ظ„ط§ طھظˆط¬ط¯ ط®ط¯ظ…ط§طھ ظ…ط³ط¬ظ„ط© ط­ط§ظ„ظٹط§ظ‹') : t('ظ„ط§ طھظˆط¬ط¯ ط£طµظ†ط§ظپ ظ…ط³ط¬ظ„ط© ط­ط§ظ„ظٹط§ظ‹'))}</p>
                    </div>
                ) : (
                    <div style={TABLE_STYLE.container}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={{ ...TABLE_STYLE.th(true) }}>{t("ط§ظ„ظƒظˆط¯")}</th>
                                        {companyBusinessType !== 'SERVICES' && usesBarcode && <th style={{ ...TABLE_STYLE.th(false) }}>{t("ط§ظ„ط¨ط§ط±ظƒظˆط¯")}</th>}
                                        <th style={{...TABLE_STYLE.th(false)}}>{companyBusinessType === 'SERVICES' ? t('ط§ظ„ط®ط¯ظ…ط©') : t('ط§ظ„صنف')}</th>
                                        {companyBusinessType !== 'SERVICES' && <th style={{...TABLE_STYLE.th(false, true)}}>{t("ط§ظ„ظƒظ…ظٹط©")}</th>}
                                        {companyBusinessType !== 'SERVICES' && <th style={{ ...TABLE_STYLE.th(false, true), }}>{t("ط³ط¹ط± ط§ظ„طھظƒظ„ظپط©")}</th>}
                                        <th style={{ ...TABLE_STYLE.th(false, true), }}>{companyBusinessType === 'SERVICES' ? t('ط³ط¹ط± ط§ظ„ط®ط¯ظ…ط©') : t('ط³ط¹ط± ط§ظ„ط¨ظٹط¹')}</th>
                                        {companyBusinessType !== 'SERVICES' && <th style={{...TABLE_STYLE.th(false, true)}}>{t("ظ…طھظˆط³ط· ط§ظ„طھظƒظ„ظپط©")}</th>}
                                        {companyBusinessType !== 'SERVICES' && <th style={{ ...TABLE_STYLE.th(false, true), }}>{t("إجمالي التكلفة")}</th>}
                                        <th style={{ ...TABLE_STYLE.th(false), textAlign: 'center' }}>{t("ط¥ط¬ط±ط§ط،")}</th>
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
                                                    <td style={{...TABLE_STYLE.td(false)}}><div style={{ fontWeight: 600, color: C.textSecondary, fontSize: '12px', fontFamily: OUTFIT, letterSpacing: '1px' }}>{item.barcode || 'â€”'}</div></td>
                                                )}
                                                <td style={{...TABLE_STYLE.td(false)}}><div style={{ fontWeight: 700, color: C.textPrimary, fontSize: '13px', fontFamily: CAIRO }}>{item.name}</div></td>
                                                {companyBusinessType !== 'SERVICES' && (
                                                    <td style={{ ...TABLE_STYLE.td(false, true), fontFamily: OUTFIT, fontWeight: 600, color: C.textSecondary, }}>{fmt(totalQty)} <span style={{ fontSize: '10px', color: C.textMuted, fontFamily: CAIRO, fontWeight: 500 }}>{item.unit?.name || t('ظ‚ط·ط¹ط©')}</span></td>
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
                                                            <button onClick={() => { setPrintBarcodeItem(item); setBarcodeCopies(1); }} style={TABLE_STYLE.actionBtn(C.teal)} title={t("ط·ط¨ط§ط¹ط© ط¨ط§ط±ظƒظˆط¯")}>
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
                    title={companyBusinessType === 'SERVICES' ? (form.id ? t('طھط¹ط¯ظٹظ„ ط¨ظٹط§ظ†ط§طھ ط§ظ„ط®ط¯ظ…ط©') : t('إضافة خدمة جديدة')) : (form.id ? t('طھط¹ط¯ظٹظ„ ط¨ظٹط§ظ†ط§طھ ط§ظ„صنف') : t('ط¥ط¶ط§ظپط© صنف ط¬ط¯ظٹط¯'))}
                    icon={form.id ? Pencil : Plus}
                    maxWidth="640px"
                >
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                        <div style={{ display: 'grid', gridTemplateColumns: (companyBusinessType === 'SERVICES' || !usesBarcode) ? '140px 1fr' : '120px 160px 1fr', gap: '14px' }}>
                            <div>
                                <label style={LS}>{companyBusinessType === 'SERVICES' ? t('ظƒظˆط¯ ط§ظ„ط®ط¯ظ…ط©') : t('ظƒظˆط¯ ط§ظ„صنف')}</label>
                                <div style={{ position: 'relative' }}>
                                    <input type="text" readOnly disabled value={form.code} style={{ ...IS, color: C.textSecondary, background: C.inputBg, borderStyle: 'dashed', paddingInlineStart: '32px' }} />
                                    <ShieldCheck size={13} style={{ position: 'absolute', insetInlineStart: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                                </div>
                            </div>

                            {companyBusinessType !== 'SERVICES' && usesBarcode && (
                                <div>
                                    <label style={LS}>{t('ط§ظ„ط¨ط§ط±ظƒظˆط¯ ط§ظ„ط¥ط¶ط§ظپظٹ')}</label>
                                    <input type="text" placeholder={t("ط³ظƒط§ظ† ط§ظ„ط¨ط§ط±ظƒظˆط¯...")} value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} style={{ ...IS, fontFamily: OUTFIT, fontWeight: 600, direction: 'ltr' }} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                            )}

                            <div>
                                <label style={LS}>{companyBusinessType === 'SERVICES' ? t('ط§ط³ظ… ط§ظ„ط®ط¯ظ…ط©') : t('ط§ط³ظ… ط§ظ„صنف')} <span style={{ color: C.danger }}>*</span></label>
                                <input type="text" required autoFocus placeholder={companyBusinessType === 'SERVICES' ? t("ظ…ط«ط§ظ„: ط§ط³طھط´ط§ط±ط© ظ‚ط§ظ†ظˆظ†ظٹط©") : (usesBarcode ? t("ظ…ط«ط§ظ„: ط²ظٹطھ ظ…ظˆطھط± 5 ظ„طھط±") : t("ط§ط³ظ… ط§ظ„ظ…ظ†طھط¬"))} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={IS} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                            <div>
                                <label style={LS}>{companyBusinessType === 'SERVICES' ? t('طھطµظ†ظٹظپ ط§ظ„ط®ط¯ظ…ط©') : t('ط§ظ„طھطµظ†ظٹظپ')}</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <div style={{ flex: 1 }}>
                                        <CustomSelect value={form.categoryId} onChange={v => setForm({ ...form, categoryId: v })} placeholder={t("ط§ط®طھط± ط§ظ„طھطµظ†ظٹظپ...")} maxHeight="165px" options={categories.map(c => ({ value: c.id, label: c.name, icon: Boxes }))} />
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
                                    <label style={LS}>{t('ط­ط§ظ„ط© ط§ظ„ط®ط¯ظ…ط©')}</label>
                                    <CustomSelect
                                        value={form.status}
                                        onChange={v => setForm({ ...form, status: v })}
                                        options={[
                                            { value: 'active', label: t('ظ†ط´ط·'), icon: Check },
                                            { value: 'inactive', label: t('ط؛ظٹط± ظ†ط´ط·'), icon: X }
                                        ]}
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label style={LS}>{t('ظˆط­ط¯ط© ط§ظ„ظ‚ظٹط§ط³')}</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <div style={{ flex: 1 }}>
                                            <CustomSelect value={form.unitId} onChange={v => setForm({ ...form, unitId: v })} placeholder={t("ظ‚ط·ط¹ط©طŒ ظƒط±طھظˆظ†ط©...")} maxHeight="165px" options={unitsData.map(u => ({ value: u.id, label: u.name, icon: Package }))} />
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
                                <label style={LS}>{t('ظˆطµظپ ط§ظ„ط®ط¯ظ…ط©')}</label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    placeholder={t("ط§ظƒطھط¨ طھظپط§طµظٹظ„ ط§ظ„ط®ط¯ظ…ط© ظ‡ظ†ط§ ظ„ظٹطھظ… ط³ط­ط¨ظ‡ط§ ظپظٹ ط§ظ„ظپط§طھظˆط±ط©...")}
                                    style={{ ...IS, height: '100px', padding: '10px', resize: 'none' }}
                                    onFocus={focusIn} onBlur={focusOut}
                                />
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={LS}>{t('ط³ط¹ط± ط§ظ„طھظƒظ„ظپط©')}</label>
                                        <div style={{ position: 'relative' }}>
                                            <input type="text" inputMode="decimal" placeholder="0.00" value={formatWithCommas(form.costPrice === 0 ? '' : form.costPrice)} onChange={e => setForm({ ...form, costPrice: e.target.value.replace(/[^0-9.]/g, '') as any })} style={{ ...IS, paddingInlineStart: '34px', fontFamily: OUTFIT, fontWeight: 700 }} onFocus={focusIn} onBlur={focusOut} />
                                            <span style={{ position: 'absolute', insetInlineStart: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: C.textMuted, fontWeight: 700 }}>{currencySymbol}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={LS}>{t('ط³ط¹ط± ط§ظ„ط¨ظٹط¹')}</label>
                                        <div style={{ position: 'relative' }}>
                                            <input type="text" inputMode="decimal" placeholder="0.00" value={formatWithCommas(form.sellPrice === 0 ? '' : form.sellPrice)} onChange={e => setForm({ ...form, sellPrice: e.target.value.replace(/[^0-9.]/g, '') as any })} style={{ ...IS, paddingInlineStart: '34px', fontFamily: OUTFIT, fontWeight: 700 }} onFocus={focusIn} onBlur={focusOut} />
                                            <span style={{ position: 'absolute', insetInlineStart: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: C.textMuted, fontWeight: 700 }}>{currencySymbol}</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={LS}>{t('ط­ط¯ ط§ظ„ط·ظ„ط¨')} <span style={{ color: C.textMuted, fontWeight: 500 }}>({t('تنبيه ظ†ظ‚طµ ط§ظ„ظ…ط®ط²ظˆظ†')})</span></label>
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
                                        <div style={{ ...STitle, marginBottom: '6px', color: C.primary }}><MapPin size={14} /> {t('ط§ظ„ط±طµظٹط¯ ط§ظ„ط§ظپطھطھط§ط­ظٹ')}</div>
                                        <p style={{ fontSize: '10px', color: C.textMuted, margin: '0 0 6px', fontWeight: 500 }}>{t('ط§ط®طھظٹط§ط±ظٹ â€” ظٹظ…ظƒظ† ط¥ط¶ط§ظپط© ط§ظ„ظƒظ…ظٹط© ظ„ط§ط­ظ‚ط§ظ‹ ظ…ظ† ظپط§طھظˆط±ط© ظ…ط´طھط±ظٹط§طھ')}</p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                            <div>
                                                <label style={LS}>{t('ط§ظ„ظ…ط®ط²ظ†')} {form.initialQuantity > 0 && !form.warehouseId && <span style={{ color: C.danger, marginInlineStart: '6px' }}>* {t('ظ…ط·ظ„ظˆط¨')}</span>}</label>
                                                <CustomSelect value={form.warehouseId} onChange={v => { setForm({ ...form, warehouseId: v }); localStorage.setItem('last_warehouse_id', v); }} openUp={true} hideSearch={true} placeholder={t("ط§ط®طھط± ط§ظ„ظ…ط®ط²ظ†...")} options={warehouses.map(w => ({ value: w.id, label: w.name, icon: MapPin }))} />
                                            </div>
                                            <div>
                                                <label style={LS}>{t('ط§ظ„ظƒظ…ظٹط© ط§ظ„ط§ظپطھطھط§ط­ظٹط©')}</label>
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
                                                <span>{t('ط§ظ„ظ‚ظٹظ…ط© ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹط© ظ„ظ„ظ…ط®ط²ظˆظ†')}</span>
                                                <span style={{ fontFamily: OUTFIT }}>{(form.initialQuantity * form.costPrice).toLocaleString()} <span style={{ fontFamily: CAIRO }}>{currencySymbol}</span></span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        <div style={{ display: 'flex', gap: '12px', borderTop: `1px solid ${C.border}`, paddingTop: '10px', marginTop: '0px' }}>
                            <button type="submit" disabled={isSubmitting || (companyBusinessType !== 'SERVICES' && form.initialQuantity > 0 && !form.warehouseId)} style={{ flex: 1, height: '44px', borderRadius: '10px', border: 'none', background: (isSubmitting || (companyBusinessType !== 'SERVICES' && form.initialQuantity > 0 && !form.warehouseId)) ? 'rgba(37, 106, 244,0.3)' : 'linear-gradient(135deg,#256af4,#256af4)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: CAIRO }}>
                                {isSubmitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : (companyBusinessType === 'SERVICES' ? (form.id ? t('ط­ظپط¸ ط§ظ„ط®ط¯ظ…ط©') : t('ط¥ط¶ط§ظپط© ط§ظ„ط®ط¯ظ…ط©')) : (form.id ? t('ط­ظپط¸ ط§ظ„طھط¹ط¯ظٹظ„ط§طھ') : t('ط¥ط¶ط§ظپط© ط§ظ„صنف')))}
                            </button>
                            <button type="button" onClick={() => setShowModal(false)} style={{ width: '100px', height: '44px', borderRadius: '10px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>{t('طھط±ط§ط¬ط¹')}</button>
                        </div>
                    </form>
                </AppModal>

                <AppModal show={!!deleteItem} onClose={() => setDeleteItem(null)} isDelete={true} title={t("طھط£ظƒظٹط¯ ط­ط°ظپ ط§ظ„صنف")} itemName={deleteItem?.name} onConfirm={confirmDelete} isSubmitting={isSubmitting} />

                {/* Print Barcode Modal */}
                <AppModal show={!!printBarcodeItem} onClose={() => setPrintBarcodeItem(null)} title={t("ط·ط¨ط§ط¹ط© ط¨ط§ط±ظƒظˆط¯ ط§ظ„صنف")} icon={Printer} maxWidth="360px">
                    {printBarcodeItem && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
                            <div id="barcode-svg-container" style={{ display: 'none' }}>
                                <Barcode value={printBarcodeItem.barcode || printBarcodeItem.code} width={1.5} height={40} fontSize={12} displayValue={true} background="transparent" margin={0} />
                            </div>

                            <div style={{ background: '#fff', padding: '20px 15px', borderRadius: '16px', boxShadow: `0 8px 30px rgba(0,0,0,0.15)`, border: `1px solid ${C.border}` }}>
                                <Barcode value={printBarcodeItem.barcode || printBarcodeItem.code} width={1.8} height={50} fontSize={14} displayValue={true} background="#fff" margin={0} />
                            </div>

                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ ...LS }}>{t('ط¹ط¯ط¯ ط§ظ„ظ†ط³ط® ط§ظ„ظ…ط±ط§ط¯ ط·ط¨ط§ط¹طھظ‡ط§')}</label>
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

                                let htmlString = `<!DOCTYPE html><html dir="${isRtl ? 'rtl' : 'ltr'}"><head><title>${t('ط·ط¨ط§ط¹ط© ط¨ط§ط±ظƒظˆط¯')}</title>`;
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

                {/* Quick Add Modals */}
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
