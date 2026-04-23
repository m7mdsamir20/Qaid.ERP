'use client';
import { formatNumber } from '@/lib/currency';
import { Currency } from '@/components/Currency';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { Users, Plus, Trash2, Search, Phone, MapPin, Edit3, Loader2, UserPlus, UserX, TrendingUp, TrendingDown, ShieldCheck, AlertTriangle } from 'lucide-react';
import { THEME, C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut, TABLE_STYLE, SEARCH_STYLE } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import AppModal from '@/components/AppModal';
import { useSession } from 'next-auth/react';
import { useCurrency } from '@/hooks/useCurrency';
import Link from 'next/link';
import { getCountryPlaceholders } from '@/lib/placeholders';
import { getAddressConfig } from '@/lib/addressConfig';

interface Customer {
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
    creditLimit: number | null;
    createdAt: string;
}

function formatAddress(c: Customer) {
    return [c.addressRegion, c.addressCity, c.addressDistrict, c.addressStreet].filter(Boolean).join('، ');
}

export default function CustomersPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const { symbol: cSymbol } = useCurrency();
    const businessType = (session?.user as any)?.businessType?.toUpperCase();
    const isServices = businessType === 'SERVICES';
    const ph = getCountryPlaceholders((session?.user as any)?.countryCode);
    const countryCode = (session?.user as any)?.countryCode || 'EG';
    const addrCfg = getAddressConfig(countryCode);

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'debit' | 'credit'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteItem, setDeleteItem] = useState<Customer | null>(null);
    const [deleteError, setDeleteError] = useState('');

    const [form, setForm] = useState({
        name: '', phone: '',
        addressRegion: '', addressCity: '', addressDistrict: '', addressStreet: '',
        type: 'individual', taxNumber: '', crNumber: '', contactPerson: '',
        openingBalance: '', balanceType: 'debit' as 'credit' | 'debit',
        creditLimit: ''
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/customers');
            if (res.ok) setCustomers(await res.json());
        } catch (error) {
            console.error('Failed to fetch:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const formatWithCommas = (val: string | number) => {
        if (val === undefined || val === null || val === '') return '';
        const s = val.toString().replace(/,/g, '');
        if (isNaN(Number(s))) return s;
        const [int, dec] = s.split('.');
        return int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (dec !== undefined ? '.' + dec : '');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const method = editingId ? 'PUT' : 'POST';

            // Clean numeric fields
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
                creditLimit: parseFloat(form.creditLimit.replace(/,/g, '')) || 0,
                ...(editingId ? { id: editingId } : {}),
            };

            const res = await fetch('/api/customers', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setShowModal(false);
                fetchData();
            } else {
                alert(t('حدث خطأ أثناء الحفظ'));
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
            const res = await fetch(`/api/customers?id=${deleteItem.id}`, { method: 'DELETE' });
            if (res.ok) {
                setDeleteItem(null);
                setDeleteError('');
                fetchData();
            } else {
                const errorData = await res.json();
                setDeleteError(errorData.error || t('فشل في حذف العميل لوجود معاملات مرتبطة'));
            }
        } catch (error) {
            setDeleteError(t('خطأ في الاتصال بالسيرفر'));
        } finally {
            setSubmitting(false);
        }
    };

    const openEdit = (c: Customer) => {
        setEditingId(c.id);
        setForm({
            name: c.name,
            phone: c.phone || '',
            addressRegion: c.addressRegion || '',
            addressCity: c.addressCity || '',
            addressDistrict: c.addressDistrict || '',
            addressStreet: c.addressStreet || '',
            type: c.type || 'individual',
            taxNumber: c.taxNumber || '',
            crNumber: c.crNumber || '',
            contactPerson: c.contactPerson || '',
            openingBalance: '',
            balanceType: c.balance < 0 ? 'credit' : 'debit',
            creditLimit: c.creditLimit ? String(c.creditLimit) : ''
        });
        setShowModal(true);
    };

    const filteredAll = customers.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone || '').includes(search);
        if (!matchesSearch) return false;
        if (statusFilter === 'debit') return c.balance > 0; // مديونيات (موجب)
        if (statusFilter === 'credit') return c.balance < 0; // أرصدة مقدمة (سالب)
        return true;
    });

    const paginated = filteredAll.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

    const fmt = (num: number) => formatNumber(num);
    const fmtInput = (v: any) => {
        if (v === '' || v === undefined || v === null) return '';
        const n = parseFloat(String(v).replace(/,/g, ''));
        if (isNaN(n)) return '';
        return formatNumber(n);
    };

    const stats = [
        { label: t('إجمالي العملاء'), value: customers.length, icon: <Users size={18} />, color: '#256af4', suffix: t('عميل') },
        { label: t('مديونيات العملاء'), value: customers.filter(c => c.balance > 0).reduce((s, c) => s + Math.abs(c.balance), 0), icon: <TrendingUp size={18} />, color: '#10b981', suffix: cSymbol },
        { label: t('أرصدة مقدمة'), value: customers.filter(c => c.balance < 0).reduce((s, c) => s + Math.abs(c.balance), 0), icon: <TrendingDown size={18} />, color: '#fb7185', suffix: cSymbol },
    ];

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '60px', background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>

                <PageHeader
                    title={t("العملاء")}
                    subtitle={t("إدارة بيانات العملاء والشركات والمستحقات")}
                    icon={Users}
                    primaryButton={{
                        label: t("إضافة عميل"),
                        onClick: () => {
                            setEditingId(null);
                            setForm({
                                name: '', phone: '',
                                addressRegion: '', addressCity: '', addressDistrict: '', addressStreet: '',
                                type: 'individual', taxNumber: '', crNumber: '', contactPerson: '',
                                openingBalance: '', balanceType: 'debit', creditLimit: ''
                            });
                            setShowModal(true);
                        },
                        icon: UserPlus
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
                                    <span style={{ fontSize: '16px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{fmt(s.value)}</span>
                                    <span style={{ fontSize: '11px', color: C.textMuted, fontWeight: 500 }}>{s.suffix}</span>
                                </div>
                            </div>
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                {s.icon}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Toolbar - Search & Status Filters */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, pointerEvents: 'none' }} />
                        <input
                            type="text"
                            placeholder={t("ابحث باسم العميل أو رقم الهاتف...")}
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

                    <div style={{ display: 'flex', gap: '6px', background: C.card, padding: '4px', borderRadius: '12px', border: `1px solid ${C.border}` }}>
                        {[
                            { id: 'all', label: t('الكل') },
                            { id: 'debit', label: t('المدينين') },
                            { id: 'credit', label: t('الدائنين') },
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setStatusFilter(f.id as any)}
                                style={{
                                    padding: '0 16px', height: '32px', borderRadius: '8px',
                                    border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                                    fontFamily: CAIRO, transition: 'all 0.2s',
                                    background: statusFilter === f.id ? C.primary : 'transparent',
                                    color: statusFilter === f.id ? '#fff' : C.textSecondary,
                                }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Table (Suppliers Style) ── */}
                <div style={TABLE_STYLE.container}>
                    {loading ? (
                        <div style={{ padding: '60px' }}>
                            <Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: C.primary, margin: '0 auto' }} />
                        </div>
                    ) : filteredAll.length === 0 ? (
                        <div style={{ padding: '70px' }}>
                            <UserX size={36} style={{ color: C.textMuted, opacity: 0.3, margin: '0 auto 10px' }} />
                            <p style={{ fontSize: '15px', fontWeight: 500, color: C.textSecondary, margin: 0, fontFamily: CAIRO }}>{search ? t('لا توجد نتائج بحث مطابقة') : t('لا يوجد عملاء مضافين حالياً')}</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={{ ...TABLE_STYLE.th(true) }}>{t('العميل')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false) }}>{t('رقم الهاتف')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false) }}>{t('العنوان')}</th>
                                        <th style={TABLE_STYLE.th(false, true)}>{t('الرصيد الحالي')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false), textAlign: 'center' }}>{t('إجراءات')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.map((c, idx) => (
                                        <tr key={c.id} style={TABLE_STYLE.row(idx === paginated.length - 1)}
                                            onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ ...TABLE_STYLE.td(true), textAlign: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                                                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: C.primaryBg, border: `1px solid ${C.primaryBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary, fontSize: '12px', fontWeight: 700, fontFamily: OUTFIT }}>{c.name.charAt(0)}</div>
                                                    <Link
                                                        href={`/reports/customer-statement?customerId=${c.id}`}
                                                        style={{ fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO, textDecoration: 'none', transition: 'all 0.2s' }}
                                                        onMouseEnter={e => { e.currentTarget.style.color = C.primary; }}
                                                        onMouseLeave={e => { e.currentTarget.style.color = C.textPrimary; }}
                                                    >
                                                        {c.name}
                                                    </Link>
                                                </div>
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false),  fontFamily: OUTFIT, color: C.textSecondary, fontSize: '13px' }}>{c.phone || '—'}</td>
                                            <td style={{ ...TABLE_STYLE.td(false),  color: C.textMuted, fontSize: '13px', fontFamily: CAIRO }}>{formatAddress(c) || '—'}</td>
                                            <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 12px', borderRadius: '30px', fontSize: '10px', fontWeight: 600,
                                                    background: c.balance < 0 ? 'rgba(239, 68, 68, 0.12)' : (c.balance > 0 ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)'),
                                                    color: c.balance < 0 ? '#fb7185' : (c.balance > 0 ? '#4ade80' : C.textMuted),
                                                    border: `1px solid ${c.balance < 0 ? 'rgba(239, 68, 68, 0.22)' : (c.balance > 0 ? 'rgba(74,222,128,0.22)' : C.border)}`,
                                                }}>
                                                    <span style={{ fontFamily: CAIRO }}>{c.balance < 0 ? t('له عندنا') : (c.balance > 0 ? t('عليه لنا') : t('متزن'))}</span>
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
                    )}
                </div>

                {/* ── Modal (REVERTED TO FAVORITE PREMIUM DESIGN) ── */}
                <AppModal show={showModal} onClose={() => setShowModal(false)} title={editingId ? t('تعديل بيانات العميل') : t('إضافة عميل جديد')} icon={UserPlus} maxWidth="520px">
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            {/* النوع + الاسم */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 0.8fr) 1.2fr', gap: '12px' }}>
                                <div>
                                    <label style={LS}>{t('نوع العميل')} <span style={{ color: C.danger }}>*</span></label>
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
                                    <label style={LS}>{form.type === 'company' ? t('اسم الشركة') : t('اسم العميل')} <span style={{ color: C.danger }}>*</span></label>
                                    <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={IS} onFocus={focusIn} onBlur={focusOut} placeholder={form.type === 'company' ? t('مثال: شركة النور للتجارة') : t('مثال: أحمد محمد')} />
                                </div>
                            </div>

                            {/* العنوان — 4 خانات */}
                            <div>
                                <label style={LS}>{t('العنوان')}</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
                                    <div>
                                        <label style={{ ...LS, fontSize: '10px', color: C.textMuted, marginBottom: '3px' }}>{addrCfg.labels[0]}</label>
                                        <input value={form.addressRegion} onChange={e => setForm({ ...form, addressRegion: e.target.value })} style={IS} onFocus={focusIn} onBlur={focusOut} placeholder={addrCfg.placeholders[0]} />
                                    </div>
                                    <div>
                                        <label style={{ ...LS, fontSize: '10px', color: C.textMuted, marginBottom: '3px' }}>{addrCfg.labels[1]}</label>
                                        <input value={form.addressCity} onChange={e => setForm({ ...form, addressCity: e.target.value })} style={IS} onFocus={focusIn} onBlur={focusOut} placeholder={addrCfg.placeholders[1]} />
                                    </div>
                                    <div>
                                        <label style={{ ...LS, fontSize: '10px', color: C.textMuted, marginBottom: '3px' }}>{addrCfg.labels[2]}</label>
                                        <input value={form.addressDistrict} onChange={e => setForm({ ...form, addressDistrict: e.target.value })} style={IS} onFocus={focusIn} onBlur={focusOut} placeholder={addrCfg.placeholders[2]} />
                                    </div>
                                    <div>
                                        <label style={{ ...LS, fontSize: '10px', color: C.textMuted, marginBottom: '3px' }}>{addrCfg.labels[3]}</label>
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
                                    <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={{ ...IS, textAlign: 'start', direction: 'ltr', fontFamily: OUTFIT }} onFocus={focusIn} onBlur={focusOut} placeholder={ph.phone} />
                                </div>
                                {form.type === 'company' && (
                                    <div>
                                        <label style={LS}>{t('المسؤول / جهة الاتصال')}</label>
                                        <input value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} style={IS} onFocus={focusIn} onBlur={focusOut} placeholder={t('مثال: محمد علي')} />
                                    </div>
                                )}
                            </div>
                            <div>
                                <label style={LS}>{t('الحد الائتماني المسموح (اختياري)')}</label>
                                <div style={{ position: 'relative', background: C.inputBg, borderRadius: THEME.input.radius, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                                    {/* Digital Zero Watermark */}
                                    {!form.creditLimit && (
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', pointerEvents: 'none', fontFamily: OUTFIT }}>
                                            0.00
                                        </div>
                                    )}
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={formatWithCommas(form.creditLimit)}
                                        onChange={e => {
                                            const v = e.target.value.replace(/[^0-9.]/g, '');
                                            if ((v.match(/\./g) || []).length > 1) return;
                                            setForm({ ...form, creditLimit: v });
                                        }}
                                        style={{ ...IS, border: 'none', background: 'transparent', fontWeight: 600, color: C.textPrimary, height: '42px', fontSize: '15px', width: '100%', padding: '0', textAlign: 'center', paddingInlineStart: '40px', paddingInlineEnd: '40px' }}
                                        onFocus={focusIn} onBlur={focusOut}
                                    />
                                    <span style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: C.textMuted, fontFamily: CAIRO }}>{cSymbol}</span>
                                </div>
                            </div>
                            {!editingId && (
                                <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <label style={{ ...LS, marginBottom: 0 }}>{t('الرصيد الافتتاحي (عند بداية التعامل)')}</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button type="button" onClick={() => setForm({ ...form, balanceType: 'debit' })} style={{ flex: 1, height: '38px', borderRadius: '8px', border: `1px solid ${form.balanceType === 'debit' ? '#4ade80' : C.border}`, background: form.balanceType === 'debit' ? 'rgba(74,222,128,0.1)' : 'transparent', color: form.balanceType === 'debit' ? '#4ade80' : C.textSecondary, fontWeight: 700, fontSize: '12px', cursor: 'pointer', fontFamily: CAIRO }}>{t('عليه (مدين)')}</button>
                                        <button type="button" onClick={() => setForm({ ...form, balanceType: 'credit' })} style={{ flex: 1, height: '38px', borderRadius: '8px', border: `1px solid ${form.balanceType === 'credit' ? '#fb7185' : C.border}`, background: form.balanceType === 'credit' ? 'rgba(251,113,133,0.1)' : 'transparent', color: form.balanceType === 'credit' ? '#fb7185' : C.textSecondary, fontWeight: 700, fontSize: '12px', cursor: 'pointer', fontFamily: CAIRO }}>{t('له (دائن)')}</button>
                                    </div>
                                    <div style={{ position: 'relative', background: C.inputBg, borderRadius: THEME.input.radius, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                                        {/* Digital Zero Watermark */}
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
                                            style={{ ...IS, border: 'none', background: 'transparent', fontWeight: 600, color: C.textPrimary, height: '42px', fontSize: '15px', width: '100%', padding: '0', textAlign: 'center', paddingInlineStart: '40px', paddingInlineEnd: '40px' }}
                                            onFocus={focusIn} onBlur={focusOut}
                                        />
                                        <span style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: C.textMuted, fontFamily: CAIRO }}>{cSymbol}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', marginTop: '28px' }}>
                            <button type="submit" disabled={submitting} style={{ height: '44px', borderRadius: '10px', background: C.primary, color: '#fff', border: 'none', fontWeight: 600, fontSize: '13px', fontFamily: CAIRO, cursor: submitting ? 'not-allowed' : 'pointer' }}>{submitting ? t('جاري الحفظ...') : (editingId ? t('حفظ التغييرات') : t('إضافة العميل الآن'))}</button>
                            <button type="button" onClick={() => setShowModal(false)} style={{ height: '44px', borderRadius: '10px', background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO, cursor: 'pointer' }}>{t('إلغاء')}</button>
                        </div>
                    </form>
                </AppModal>

                <AppModal
                    show={!!deleteItem}
                    onClose={() => { setDeleteItem(null); setDeleteError(''); }}
                    isDelete={true}
                    title={t("تأكيد حذف العميل")}
                    itemName={deleteItem?.name}
                    onConfirm={handleDelete}
                    isSubmitting={submitting}
                    error={deleteError}
                />

            </div>
            <style jsx global>{` @keyframes spin { to { transform:rotate(360deg); } } `}</style>
        </DashboardLayout>
    );
}
