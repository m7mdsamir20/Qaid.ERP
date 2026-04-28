'use client';
import { formatNumber } from '@/lib/currency';
import { Currency } from '@/components/Currency';
import CustomSelect from '@/components/CustomSelect';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { Ticket, Plus, Trash2, Search, Edit3, Loader2, Tag, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { THEME, C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut, TABLE_STYLE } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import AppModal from '@/components/AppModal';
import { useSession } from 'next-auth/react';
import { useCurrency } from '@/hooks/useCurrency';

interface Coupon {
    id: string;
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    maxDiscountAmount: number | null;
    minOrderValue: number | null;
    startDate: string | null;
    endDate: string | null;
    usageLimit: number | null;
    usedCount: number;
    isActive: boolean;
    createdAt: string;
}

export default function CouponsPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { symbol: cSymbol } = useCurrency();

    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteItem, setDeleteItem] = useState<Coupon | null>(null);
    const [deleteError, setDeleteError] = useState('');

    const [form, setForm] = useState({
        code: '',
        type: 'percentage',
        value: '',
        maxDiscountAmount: '',
        minOrderValue: '',
        startDate: '',
        endDate: '',
        usageLimit: '',
        isActive: true
    });

    const handleAmountChange = (key: string, val: string, format: boolean = true) => {
        let cleaned = val.replace(/[^0-9.]/g, '');
        const parts = cleaned.split('.');
        if (parts.length > 2) cleaned = parts[0] + '.' + parts.slice(1).join('');
        
        if (format && cleaned) {
            if (!cleaned.includes('.')) {
                cleaned = parseInt(cleaned, 10).toLocaleString('en-US');
            } else {
                cleaned = (parseInt(parts[0] || '0', 10).toLocaleString('en-US')) + '.' + parts[1];
            }
        }
        setForm(f => ({ ...f, [key]: cleaned }));
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/coupons');
            if (res.ok) setCoupons(await res.json());
        } catch (error) {
            console.error('Failed to fetch:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const method = editingId ? 'PUT' : 'POST';
            const url = editingId ? `/api/coupons/${editingId}` : '/api/coupons';

            const payload = {
                code: form.code.toUpperCase(),
                type: form.type,
                value: parseFloat(String(form.value).replace(/,/g, '')) || 0,
                maxDiscountAmount: form.maxDiscountAmount ? parseFloat(String(form.maxDiscountAmount).replace(/,/g, '')) : null,
                minOrderValue: form.minOrderValue ? parseFloat(String(form.minOrderValue).replace(/,/g, '')) : null,
                startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
                endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
                usageLimit: form.usageLimit ? parseInt(form.usageLimit) : null,
                isActive: form.isActive
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setShowModal(false);
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || t('حدث خطأ أثناء الحفظ'));
            }
        } catch (error) {
            alert(t('خطأ في الاتصال بالسيرفر'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteItem) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/coupons/${deleteItem.id}`, { method: 'DELETE' });
            if (res.ok) {
                setDeleteItem(null);
                setDeleteError('');
                fetchData();
            } else {
                const errorData = await res.json();
                setDeleteError(errorData.error || t('فشل في حذف الكوبون'));
            }
        } catch (error) {
            setDeleteError(t('خطأ في الاتصال بالسيرفر'));
        } finally {
            setSubmitting(false);
        }
    };

    const openEdit = (c: Coupon) => {
        setEditingId(c.id);
        setForm({
            code: c.code,
            type: c.type,
            value: c.type === 'fixed' ? Number(c.value).toLocaleString('en-US') : String(c.value),
            maxDiscountAmount: c.maxDiscountAmount ? Number(c.maxDiscountAmount).toLocaleString('en-US') : '',
            minOrderValue: c.minOrderValue ? Number(c.minOrderValue).toLocaleString('en-US') : '',
            startDate: c.startDate ? c.startDate.substring(0, 16) : '',
            endDate: c.endDate ? c.endDate.substring(0, 16) : '',
            usageLimit: c.usageLimit ? String(c.usageLimit) : '',
            isActive: c.isActive
        });
        setShowModal(true);
    };

    const filteredAll = coupons.filter(c => c.code.toLowerCase().includes(search.toLowerCase()));
    const paginated = filteredAll.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => { setCurrentPage(1); }, [search]);

    const activeCount = coupons.filter(c => c.isActive).length;
    const stats = [
        { label: t('إجمالي الكوبونات'), value: coupons.length, icon: <Ticket size={18} />, color: '#256af4', suffix: t('كوبون') },
        { label: t('الكوبونات النشطة'), value: activeCount, icon: <CheckCircle size={18} />, color: '#10b981', suffix: t('نشط') },
        { label: t('إجمالي الاستخدام'), value: coupons.reduce((s, c) => s + c.usedCount, 0), icon: <Tag size={18} />, color: '#8b5cf6', suffix: t('مرة') },
    ];

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '60px', background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>

                <PageHeader
                    title={t("كوبونات الخصم")}
                    subtitle={t("إدارة أكواد الخصم والعروض الترويجية للعملاء")}
                    icon={Ticket}
                    primaryButton={{
                        label: t("إضافة كوبون"),
                        onClick: () => {
                            setEditingId(null);
                            setForm({
                                code: '', type: 'percentage', value: '', maxDiscountAmount: '',
                                minOrderValue: '', startDate: '', endDate: '', usageLimit: '', isActive: true
                            });
                            setShowModal(true);
                        },
                        icon: Plus
                    }}
                />

                {/* KPI Stats Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '16px' }}>
                    {stats.map((s, i) => (
                        <div key={i} style={{
                            background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '10px',
                            padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            transition: 'all 0.2s', position: 'relative'
                        }}
                            onMouseEnter={e => e.currentTarget.style.background = `${s.color}15`}
                            onMouseLeave={e => e.currentTarget.style.background = `${s.color}08`}
                        >
                            <div style={{ textAlign: 'start' }}>
                                <p style={{ fontSize: '11px', fontWeight: 500, color: C.textMuted, margin: '0 0 4px', whiteSpace: 'nowrap' }}>{s.label}</p>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                    <span style={{ fontSize: '16px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{formatNumber(s.value)}</span>
                                    <span style={{ fontSize: '11px', color: C.textMuted, fontWeight: 500 }}>{s.suffix}</span>
                                </div>
                            </div>
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                {s.icon}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Toolbar */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, pointerEvents: 'none' }} />
                        <input
                            type="text"
                            placeholder={t("ابحث بكود الخصم...")}
                            style={{
                                ...IS, paddingInlineStart: '40px', height: '40px', fontSize: '13px',
                                background: C.card,
                                borderRadius: '12px'
                            }}
                            onFocus={focusIn}
                            onBlur={focusOut}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table */}
                <div style={TABLE_STYLE.container}>
                    {loading ? (
                        <div style={{ padding: '60px', textAlign: 'center' }}>
                            <Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: C.primary, margin: '0 auto' }} />
                        </div>
                    ) : filteredAll.length === 0 ? (
                        <div style={{ padding: '70px', textAlign: 'center' }}>
                            <Ticket size={36} style={{ color: C.textMuted, opacity: 0.3, margin: '0 auto 10px' }} />
                            <p style={{ fontSize: '15px', fontWeight: 500, color: C.textSecondary, margin: 0, fontFamily: CAIRO }}>{search ? t('لا توجد نتائج مطابقة') : t('لا توجد كوبونات خصم حالياً')}</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={{ ...TABLE_STYLE.th(true) }}>{t('كود الخصم')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false) }}>{t('الخصم')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false) }}>{t('الاستخدام')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false) }}>{t('تاريخ الانتهاء')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false), textAlign: 'center' }}>{t('الحالة')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false), textAlign: 'center' }}>{t('إجراءات')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.map((c, idx) => {
                                        const now = new Date();
                                        const isExpired = c.endDate ? new Date(c.endDate) < now : false;
                                        const isExhausted = c.usageLimit ? c.usedCount >= c.usageLimit : false;
                                        const isValid = c.isActive && !isExpired && !isExhausted;

                                        return (
                                            <tr key={c.id} style={TABLE_STYLE.row(idx === paginated.length - 1)}
                                                onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <td style={{ ...TABLE_STYLE.td(true), textAlign: 'center' }}>
                                                    <span style={{ fontWeight: 700, color: C.primary, fontFamily: OUTFIT, background: `${C.primary}10`, padding: '4px 8px', borderRadius: '6px', border: `1px solid ${C.primary}30` }}>
                                                        {c.code}
                                                    </span>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, color: C.textPrimary, fontSize: '13px', fontWeight: 600 }}>
                                                    {c.type === 'percentage' ? `${c.value}%` : <Currency amount={c.value} />}
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), color: C.textSecondary, fontSize: '13px', fontFamily: OUTFIT }}>
                                                    {c.usedCount} {c.usageLimit ? `/ ${c.usageLimit}` : ''}
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), color: C.textSecondary, fontSize: '12px', fontFamily: OUTFIT }}>
                                                    {c.endDate ? new Date(c.endDate).toLocaleDateString('en-GB') : '—'}
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '30px', fontSize: '10px', fontWeight: 600,
                                                        background: isValid ? 'rgba(74,222,128,0.12)' : 'rgba(239, 68, 68, 0.12)',
                                                        color: isValid ? '#4ade80' : '#fb7185',
                                                        border: `1px solid ${isValid ? 'rgba(74,222,128,0.22)' : 'rgba(239, 68, 68, 0.22)'}`,
                                                    }}>
                                                        {isValid ? t('فعال') : (isExpired ? t('منتهي') : (isExhausted ? t('نفد') : t('معطل')))}
                                                    </span>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        <button onClick={() => openEdit(c)} style={TABLE_STYLE.actionBtn()}><Edit3 size={TABLE_STYLE.actionIconSize} /></button>
                                                        <button onClick={() => setDeleteItem(c)} style={TABLE_STYLE.actionBtn(C.danger)}><Trash2 size={TABLE_STYLE.actionIconSize} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                            <Pagination
                                total={filteredAll.length}
                                pageSize={pageSize}
                                currentPage={currentPage}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}
                </div>

                {/* Modal */}
                <AppModal show={showModal} onClose={() => setShowModal(false)} title={editingId ? t('تعديل كود الخصم') : t('إضافة كوبون جديد')} icon={Ticket} maxWidth="520px">
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={LS}>{t('كود الخصم')} <span style={{ color: C.danger }}>*</span></label>
                                    <input required value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} style={{ ...IS, fontFamily: OUTFIT }} onFocus={focusIn} onBlur={focusOut} placeholder={t('مثال: SUMMER50')} autoFocus />
                                </div>
                                <div>
                                    <label style={LS}>{t('الحالة')}</label>
                                    <CustomSelect
                                        value={form.isActive ? '1' : '0'}
                                        onChange={val => setForm({ ...form, isActive: val === '1' })}
                                        options={[
                                            { value: '1', label: t('مفعل') },
                                            { value: '0', label: t('معطل') }
                                        ]}
                                        hideSearch={true}
                                        style={{ height: '42px', fontSize: '13px', width: '100%', minWidth: '100%' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={LS}>{t('نوع الخصم')} <span style={{ color: C.danger }}>*</span></label>
                                    <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px', border: `1px solid ${C.border}` }}>
                                        <button type="button" onClick={() => setForm({ ...form, type: 'percentage', value: form.type === 'fixed' ? form.value.replace(/,/g, '') : form.value })} style={{ flex: 1, height: '32px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: CAIRO, transition: 'all 0.2s', background: form.type === 'percentage' ? C.primary : 'transparent', color: form.type === 'percentage' ? '#fff' : C.textSecondary }}>{t('نسبة')} %</button>
                                        <button type="button" onClick={() => {
                                            const newVal = form.value ? parseFloat(form.value.replace(/,/g, '')).toLocaleString('en-US') : '';
                                            setForm({ ...form, type: 'fixed', value: newVal });
                                        }} style={{ flex: 1, height: '32px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: CAIRO, transition: 'all 0.2s', background: form.type === 'fixed' ? C.primary : 'transparent', color: form.type === 'fixed' ? '#fff' : C.textSecondary }}>{t('مبلغ ثابت')}</button>
                                    </div>
                                </div>
                                <div>
                                    <label style={LS}>{t('قيمة الخصم')} <span style={{ color: C.danger }}>*</span></label>
                                    <input required type="text" value={form.value} onChange={e => handleAmountChange('value', e.target.value, form.type === 'fixed')} style={{ ...IS, fontFamily: OUTFIT, textAlign: 'center' }} onFocus={focusIn} onBlur={focusOut} placeholder={form.type === 'percentage' ? '20' : '50'} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: form.type === 'percentage' ? '1fr 1fr' : '1fr', gap: '12px' }}>
                                {form.type === 'percentage' && (
                                    <div>
                                        <label style={LS}>{t('الحد الأقصى للخصم (مبلغ اختياري)')}</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', insetInlineEnd: '14px', top: '50%', transform: 'translateY(-50%)', color: C.textMuted, fontSize: '12px', pointerEvents: 'none' }}>{cSymbol}</span>
                                            <input type="text" value={form.maxDiscountAmount} onChange={e => handleAmountChange('maxDiscountAmount', e.target.value, true)} style={{ ...IS, fontFamily: OUTFIT, paddingInlineEnd: '40px', textAlign: 'center' }} onFocus={focusIn} onBlur={focusOut} placeholder="0.00" />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label style={LS}>{t('الحد الأدنى لقيمة الطلب (اختياري)')}</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', insetInlineEnd: '14px', top: '50%', transform: 'translateY(-50%)', color: C.textMuted, fontSize: '12px', pointerEvents: 'none' }}>{cSymbol}</span>
                                        <input type="text" value={form.minOrderValue} onChange={e => handleAmountChange('minOrderValue', e.target.value, true)} style={{ ...IS, fontFamily: OUTFIT, paddingInlineEnd: '40px', textAlign: 'center' }} onFocus={focusIn} onBlur={focusOut} placeholder="0.00" />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={LS}>{t('تاريخ البداية (اختياري)')}</label>
                                    <input type="datetime-local" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} style={{ ...IS, fontFamily: OUTFIT, fontSize: '12px' }} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                                <div>
                                    <label style={LS}>{t('تاريخ الانتهاء (اختياري)')}</label>
                                    <input type="datetime-local" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} style={{ ...IS, fontFamily: OUTFIT, fontSize: '12px' }} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                            </div>

                            <div>
                                <label style={LS}>{t('الحد الأقصى لمرات الاستخدام الكلية (اختياري)')}</label>
                                <input type="number" min="1" value={form.usageLimit} onChange={e => setForm({ ...form, usageLimit: e.target.value })} style={{ ...IS, fontFamily: OUTFIT }} onFocus={focusIn} onBlur={focusOut} placeholder={t('مثال: 100 (لأول 100 مستخدم)')} />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', marginTop: '28px' }}>
                            <button type="submit" disabled={submitting} style={{ height: '44px', borderRadius: '10px', background: C.primary, color: '#fff', border: 'none', fontWeight: 600, fontSize: '13px', fontFamily: CAIRO, cursor: submitting ? 'not-allowed' : 'pointer' }}>{submitting ? t('جاري الحفظ...') : (editingId ? t('حفظ التغييرات') : t('إضافة الكوبون'))}</button>
                            <button type="button" onClick={() => setShowModal(false)} style={{ height: '44px', borderRadius: '10px', background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO, cursor: 'pointer' }}>{t('إلغاء')}</button>
                        </div>
                    </form>
                </AppModal>

                <AppModal
                    show={!!deleteItem}
                    onClose={() => { setDeleteItem(null); setDeleteError(''); }}
                    isDelete={true}
                    title={t("تأكيد حذف الكوبون")}
                    itemName={deleteItem?.code}
                    onConfirm={handleDelete}
                    isSubmitting={submitting}
                    error={deleteError}
                />
            </div>
            <style jsx global>{` @keyframes spin { to { transform:rotate(360deg); } } `}</style>
        </DashboardLayout>
    );
}
