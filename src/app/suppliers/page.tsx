'use client';
import { Currency } from '@/components/Currency';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { Truck, Plus, Phone, MapPin, X, Edit3, Trash2, Search, Loader2, TrendingUp, TrendingDown, ShieldCheck, UserX, Wallet } from 'lucide-react';
import { useSession } from 'next-auth/react';

import { THEME, C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut, TABLE_STYLE, SEARCH_STYLE } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import AppModal from '@/components/AppModal';
import { useCurrency } from '@/hooks/useCurrency';
import { getCountryPlaceholders } from '@/lib/placeholders';
import { getAddressConfig } from '@/lib/addressConfig';
import Link from 'next/link';

interface Supplier {
    id: string;
    name: string;
    phone: string | null;
    addressRegion: string | null;
    addressCity: string | null;
    addressDistrict: string | null;
    addressStreet: string | null;
    type: string;
    taxNumber: string | null;
    crNumber: string | null;
    contactPerson: string | null;
    balance: number;
    createdAt: string;
}

function formatAddress(s: Supplier) {
    return [s.addressRegion, s.addressCity, s.addressDistrict, s.addressStreet].filter(Boolean).join('، ');
}

export default function SuppliersPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const { symbol: cSymbol } = useCurrency();
    const ph = getCountryPlaceholders((session?.user as any)?.countryCode);
    const countryCode = (session?.user as any)?.countryCode || 'EG';
    const addrCfg = getAddressConfig(countryCode);

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'debit' | 'credit'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [deleteItem, setDeleteItem] = useState<Supplier | null>(null);
    const [deleteError, setDeleteError] = useState('');

    const [form, setForm] = useState({
        name: '', phone: '',
        addressRegion: '', addressCity: '', addressDistrict: '', addressStreet: '',
        type: 'individual', taxNumber: '', crNumber: '', contactPerson: '',
        openingBalance: '', balanceType: 'credit' as 'debit' | 'credit',
    });

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch('/api/suppliers');
            if (res.ok) setSuppliers(await res.json());
        } catch { } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const formatWithCommas = (val: string | number) => {
        if (val === undefined || val === null || val === '') return '';
        const s = val.toString().replace(/,/g, '');
        if (isNaN(Number(s))) return s;
        const [int, dec] = s.split('.');
        return int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (dec !== undefined ? '.' + dec : '');
    };

    const openNew = () => {
        setEditingId(null);
        setForm({ name: '', phone: '', addressRegion: '', addressCity: '', addressDistrict: '', addressStreet: '', type: 'individual', taxNumber: '', crNumber: '', contactPerson: '', openingBalance: '', balanceType: 'credit' });
        setShowModal(true);
    };

    const openEdit = (s: Supplier) => {
        setEditingId(s.id);
        setForm({
            name: s.name,
            phone: s.phone || '',
            addressRegion: s.addressRegion || '',
            addressCity: s.addressCity || '',
            addressDistrict: s.addressDistrict || '',
            addressStreet: s.addressStreet || '',
            type: s.type || 'individual',
            taxNumber: s.taxNumber || '',
            crNumber: s.crNumber || '',
            contactPerson: s.contactPerson || '',
            openingBalance: '',
            balanceType: s.balance >= 0 ? 'credit' : 'debit',
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        setSubmitting(true);
        try {
            const method = editingId ? 'PUT' : 'POST';
            const payload = {
                name: form.name,
                phone: form.phone || null,
                addressRegion: form.addressRegion || null,
                addressCity: form.addressCity || null,
                addressDistrict: form.addressDistrict || null,
                addressStreet: form.addressStreet || null,
                type: form.type,
                taxNumber: form.taxNumber || null,
                crNumber: form.crNumber || null,
                contactPerson: form.contactPerson || null,
                openingBalance: parseFloat(form.openingBalance.replace(/,/g, '')) || 0,
                balanceType: form.balanceType,
                ...(editingId ? { id: editingId } : {}),
            };

            const res = await fetch('/api/suppliers', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setShowModal(false);
                fetchData();
            }
        } finally { setSubmitting(false); }
    };

    const handleDelete = async () => {
        if (!deleteItem) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/suppliers?id=${encodeURIComponent(deleteItem.id)}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setDeleteItem(null);
                setDeleteError('');
                fetchData();
            } else {
                const errorData = await res.json();
                setDeleteError(errorData.error || t('فشل في حذف المورد'));
            }
        } catch {
            setDeleteError(t('حدث خطأ في الاتصال بالخادم، حاول مرة أخرى'));
        } finally { setSubmitting(false); }
    };

    const filteredAll = suppliers.filter(c => {
        const matchesSearch =
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.phone && c.phone.includes(searchTerm));

        const matchesStatus =
            statusFilter === 'all' ? true :
                statusFilter === 'credit' ? c.balance > 0 :
                    statusFilter === 'debit' ? c.balance < 0 : true;

        return (matchesSearch ?? false) && matchesStatus;
    });

    const paginated = filteredAll.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);

    const fmt = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

    const stats = [
        { id: 'total', label: t('إجمالي الموردين'), value: suppliers.length, icon: <Truck size={18} />, iconColor: '#256af4', suffix: t('مورد') },
        { id: 'credit', label: t('إجمالي الدائنية (له عندنا)'), value: suppliers.filter(s => s.balance > 0).reduce((a, b) => a + b.balance, 0), icon: <TrendingUp size={18} />, iconColor: '#fb7185', suffix: cSymbol },
        { id: 'debit', label: t('إجمالي المديونية (عليه لنا)'), value: suppliers.filter(s => s.balance < 0).reduce((a, b) => a + Math.abs(b.balance), 0), icon: <TrendingDown size={18} />, iconColor: '#10b981', suffix: cSymbol },
    ];

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ fontFamily: CAIRO, background: C.bg, minHeight: '100%', paddingBottom: '60px' }}>

                <PageHeader
                    title={t("الموردين")}
                    subtitle={t("إدارة بيانات الموردين والمستحقات والشركات")}
                    icon={Truck}
                    primaryButton={{
                        label: t("إضافة مورد"),
                        onClick: openNew,
                        icon: Plus
                    }}
                />

                {/* KPI Stats Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '16px' }}>
                    {stats.map((s, i) => (
                        <div key={i} style={{
                            background: `${s.iconColor}08`, border: `1px solid ${s.iconColor}33`, borderRadius: '10px',
                            padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            transition: 'all 0.2s', position: 'relative'
                        }}
                            onMouseEnter={e => e.currentTarget.style.background = `${s.iconColor}15`}
                            onMouseLeave={e => e.currentTarget.style.background = `${s.iconColor}08`}
                        >
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: '11px', fontWeight: 500, color: C.textSecondary, margin: '0 0 4px', whiteSpace: 'nowrap' }}>{s.label}</p>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                    <span style={{ fontSize: '16px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{fmt(s.value as number)}</span>
                                    <span style={{ fontSize: '11px', color: C.textSecondary, fontWeight: 500 }}>{s.suffix}</span>
                                </div>
                            </div>
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${s.iconColor}15`, border: `1px solid ${s.iconColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.iconColor }}>
                                {s.icon}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Toolbar - Search */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, pointerEvents: 'none' }} />
                        <input
                            type="text"
                            placeholder={t("ابحث باسم المورد أو رقم الهاتف...")}
                            style={{
                                ...IS, paddingInlineStart: '40px', height: '40px', fontSize: '13px',
                                background: C.card,
                                borderRadius: '12px'
                            }}
                            onFocus={focusIn}
                            onBlur={focusOut}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div style={TABLE_STYLE.container}>
                    {loading ? (
                        <div style={{  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px' }}>
                            <Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: C.primary, margin: '0 auto' }} />
                        </div>
                    ) : filteredAll.length === 0 ? (
                        <div style={{ padding: '70px' }}>
                            <UserX size={36} style={{ color: C.textSecondary, opacity: 0.3, margin: '0 auto 10px' }} />
                            <p style={{ fontSize: '15px', fontWeight: 500, color: C.textSecondary, margin: 0 }}>{searchTerm ? t('لا توجد نتائج بحث مطابقة') : t('لا يوجد موردين')}</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={{ ...TABLE_STYLE.th(true) }}>{t('المورد')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false) }}>{t('رقم الهاتف')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false) }}>{t('العنوان')}</th>
                                        <th style={TABLE_STYLE.th(false, true)}>{t('الرصيد الحالي')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false), textAlign: 'start' }}>{t('إجراءات')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.map((c, idx) => {
                                        const isCredit = c.balance > 0;
                                        const isDebit = c.balance < 0;
                                        return (
                                            <tr key={c.id} style={TABLE_STYLE.row(idx === paginated.length - 1)}
                                                onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <td style={{ ...TABLE_STYLE.td(true), textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                                                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: C.primaryBg, border: `1px solid ${C.primaryBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary, fontSize: '12px', fontWeight: 700, fontFamily: OUTFIT }}>{c.name.charAt(0)}</div>
                                                        <Link
                                                            href={`/reports/supplier-statement?supplierId=${c.id}`}
                                                            style={{ fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO, textDecoration: 'none', transition: '0.2s' }}
                                                            onMouseEnter={e => { e.currentTarget.style.color = C.primary; }}
                                                            onMouseLeave={e => { e.currentTarget.style.color = C.textPrimary; }}
                                                        >
                                                            {c.name}
                                                        </Link>
                                                    </div>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false),  fontFamily: OUTFIT, color: C.textSecondary, fontSize: '13px' }}>{c.phone || '—'}</td>
                                                <td style={{ ...TABLE_STYLE.td(false),  color: C.textSecondary, fontSize: '13px', fontFamily: CAIRO }}>{formatAddress(c) || '—'}</td>
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 12px', borderRadius: '30px', fontSize: '10px', fontWeight: 600,
                                                        background: isCredit ? 'rgba(239, 68, 68, 0.12)' : (isDebit ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)'),
                                                        color: isCredit ? '#fb7185' : (isDebit ? '#4ade80' : C.textMuted),
                                                        border: `1px solid ${isCredit ? 'rgba(239, 68, 68, 0.22)' : (isDebit ? 'rgba(74,222,128,0.22)' : C.border)}`,
                                                    }}>
                                                        <span style={{ fontFamily: CAIRO }}>{isCredit ? t('له عندنا') : (isDebit ? t('عليه لنا') : t('متزن'))}</span>
                                                        <span style={{ fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600 }}><Currency amount={Math.abs(c.balance)} /></span>
                                                    </span>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        <button onClick={() => openEdit(c)} style={TABLE_STYLE.actionBtn()}><Edit3 size={TABLE_STYLE.actionIconSize} /></button>
                                                        <button onClick={() => setDeleteItem(c)} style={TABLE_STYLE.actionBtn(C.danger)}><Trash2 size={TABLE_STYLE.actionIconSize} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
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

                <AppModal show={showModal} onClose={() => setShowModal(false)} icon={Truck} title={editingId ? t('تعديل بيانات المورد') : t('إضافة مورد جديد')} maxWidth="520px">
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            {/* النوع + الاسم */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 0.8fr) 1.2fr', gap: '12px' }}>
                                <div>
                                    <label style={LS}>{t('نوع المورد')} <span style={{ color: C.danger }}>*</span></label>
                                    <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px', border: `1px solid ${C.border}` }}>
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, type: 'individual' })}
                                            style={{
                                                flex: 1, height: '32px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: CAIRO, transition: 'all 0.2s',
                                                background: form.type === 'individual' ? C.primary : 'transparent',
                                                color: form.type === 'individual' ? '#fff' : C.textSecondary
                                            }}
                                        >{t('فرد')}</button>
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, type: 'company' })}
                                            style={{
                                                flex: 1, height: '32px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: CAIRO, transition: 'all 0.2s',
                                                background: form.type === 'company' ? C.primary : 'transparent',
                                                color: form.type === 'company' ? '#fff' : C.textSecondary
                                            }}
                                        >{t('شركة')}</button>
                                    </div>
                                </div>
                                <div>
                                    <label style={LS}>{form.type === 'company' ? t('اسم الشركة') : t('اسم المورد')} <span style={{ color: C.danger }}>*</span></label>
                                    <input required type="text" placeholder={form.type === 'company' ? t('مثال: شركة التوريدات العالمية') : t('مثال: محمد أحمد')} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={IS} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                            </div>

                            {/* العنوان — 4 خانات */}
                            <div>
                                <label style={LS}>{t('العنوان')}</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
                                    <div>
                                        <label style={{ ...LS, fontSize: '10px', color: C.textSecondary, marginBottom: '3px' }}>{addrCfg.labels[0]}</label>
                                        <input value={form.addressRegion} onChange={e => setForm({ ...form, addressRegion: e.target.value })} style={IS} onFocus={focusIn} onBlur={focusOut} placeholder={addrCfg.placeholders[0]} />
                                    </div>
                                    <div>
                                        <label style={{ ...LS, fontSize: '10px', color: C.textSecondary, marginBottom: '3px' }}>{addrCfg.labels[1]}</label>
                                        <input value={form.addressCity} onChange={e => setForm({ ...form, addressCity: e.target.value })} style={IS} onFocus={focusIn} onBlur={focusOut} placeholder={addrCfg.placeholders[1]} />
                                    </div>
                                    <div>
                                        <label style={{ ...LS, fontSize: '10px', color: C.textSecondary, marginBottom: '3px' }}>{addrCfg.labels[2]}</label>
                                        <input value={form.addressDistrict} onChange={e => setForm({ ...form, addressDistrict: e.target.value })} style={IS} onFocus={focusIn} onBlur={focusOut} placeholder={addrCfg.placeholders[2]} />
                                    </div>
                                    <div>
                                        <label style={{ ...LS, fontSize: '10px', color: C.textSecondary, marginBottom: '3px' }}>{addrCfg.labels[3]}</label>
                                        <input value={form.addressStreet} onChange={e => setForm({ ...form, addressStreet: e.target.value })} style={IS} onFocus={focusIn} onBlur={focusOut} placeholder={addrCfg.placeholders[3]} />
                                    </div>
                                </div>
                            </div>

                            {/* رقم ضريبي + سجل تجاري (شركة فقط) */}
                            {form.type === 'company' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', animation: 'fadeUp 0.3s ease both' }}>
                                    <div>
                                        <label style={LS}>{t('الرقم الضريبي')}</label>
                                        <input value={form.taxNumber} onChange={e => setForm({ ...form, taxNumber: e.target.value })} style={{ ...IS, fontFamily: OUTFIT }} onFocus={focusIn} onBlur={focusOut} placeholder={ph.taxNumber} />
                                    </div>
                                    <div>
                                        <label style={LS}>{t('السجل التجاري')}</label>
                                        <input value={form.crNumber} onChange={e => setForm({ ...form, crNumber: e.target.value })} style={{ ...IS, fontFamily: OUTFIT }} onFocus={focusIn} onBlur={focusOut} placeholder={ph.cr} />
                                    </div>
                                </div>
                            )}

                            {/* هاتف + المسؤول */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={LS}>{t('رقم الهاتف')}</label>
                                    <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={{ ...IS,  direction: 'ltr', fontFamily: OUTFIT }} placeholder={ph.phone} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                                {form.type === 'company' && (
                                    <div>
                                        <label style={LS}>{t('المسؤول / جهة الاتصال')}</label>
                                        <input value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} style={IS} onFocus={focusIn} onBlur={focusOut} placeholder={t('مثال: محمد علي')} />
                                    </div>
                                )}
                            </div>

                            {!editingId && (
                                <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <label style={{ ...LS, marginBottom: 0 }}>{t('الرصيد الافتتاحي')}</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button type="button" onClick={() => setForm({ ...form, balanceType: 'debit' })} style={{ flex: 1, height: '38px', borderRadius: '8px', border: `1px solid ${form.balanceType === 'debit' ? '#4ade80' : C.border}`, background: form.balanceType === 'debit' ? 'rgba(74,222,128,0.1)' : 'transparent', color: form.balanceType === 'debit' ? '#4ade80' : C.textSecondary, fontWeight: 700, fontSize: '12px', cursor: 'pointer', fontFamily: CAIRO }}>{t('عليه (مدين)')}</button>
                                        <button type="button" onClick={() => setForm({ ...form, balanceType: 'credit' })} style={{ flex: 1, height: '38px', borderRadius: '8px', border: `1px solid ${form.balanceType === 'credit' ? '#fb7185' : C.border}`, background: form.balanceType === 'credit' ? 'rgba(251,113,133,0.1)' : 'transparent', color: form.balanceType === 'credit' ? '#fb7185' : C.textSecondary, fontWeight: 700, fontSize: '12px', cursor: 'pointer', fontFamily: CAIRO }}>{t('له (دائن)')}</button>
                                    </div>
                                    <div style={{ position: 'relative', background: C.inputBg, borderRadius: THEME.input.radius, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                                        {!form.openingBalance && (
                                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', pointerEvents: 'none', fontFamily: OUTFIT }}>
                                                0.00
                                            </div>
                                        )}
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={formatWithCommas(form.openingBalance)}
                                            onChange={e => {
                                                const v = e.target.value.replace(/[^0-9.]/g, '');
                                                if ((v.match(/\./g) || []).length > 1) return;
                                                setForm({ ...form, openingBalance: v });
                                            }}
                                            style={{ ...IS, width: '100%', border: 'none', background: 'transparent', fontFamily: OUTFIT, fontWeight: 700, textAlign: 'center', paddingInlineStart: '40px', paddingInlineEnd: '40px' }}
                                            onFocus={focusIn} onBlur={focusOut}
                                        />
                                        <span style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: C.textSecondary }}>{cSymbol}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', marginTop: '28px' }}>
                            <button disabled={submitting} type="submit" style={{ height: '44px', borderRadius: '10px', background: C.primary, color: '#fff', border: 'none', fontWeight: 600, fontSize: '13px', fontFamily: CAIRO, cursor: submitting ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                                {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : (editingId ? t('حفظ التعديلات') : t('إضافة المورد الآن'))}
                            </button>
                            <button type="button" onClick={() => setShowModal(false)} style={{ height: '44px', borderRadius: '10px', background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO, cursor: 'pointer' }}>{t('إلغاء')}</button>
                        </div>
                    </form>
                </AppModal>

                {deleteItem && (
                    <AppModal
                        show={!!deleteItem}
                        onClose={() => { setDeleteItem(null); setDeleteError(''); }}
                        isDelete={true}
                        title={t("تأكيد حذف المورد")}
                        itemName={deleteItem.name}
                        onConfirm={handleDelete}
                        isSubmitting={submitting}
                        error={deleteError}
                    />
                )}

                <style>{`
                    @keyframes spin { to { transform: rotate(360deg); } }
                    @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
                    input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
                    input[type=number] { -moz-appearance:textfield; }
                `}</style>
            </div>
        </DashboardLayout>
    );
}
