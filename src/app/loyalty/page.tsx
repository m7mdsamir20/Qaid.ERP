'use client';
import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, OUTFIT, IS, LS, TABLE_STYLE, SEARCH_STYLE, focusIn, focusOut, PAGE_BASE } from '@/constants/theme';
import { Gift, Users, Settings, Search, Save, Loader2, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';

interface LoyaltyProgram {
    id: string;
    name: string;
    pointsPerCurrency: number;
    pointsValue: number;
    minRedeemPoints: number;
    expiryMonths: number | null;
    isActive: boolean;
}

interface CustomerPointsRecord {
    id: string;
    balance: number;
    totalEarned: number;
    totalRedeemed: number;
    updatedAt: string;
    customer: { name: string; phone: string };
}

const TABS = [
    { id: 'settings', label: 'إعدادات البرنامج', icon: Settings },
    { id: 'customers', label: 'رصيد العملاء', icon: Users },
];

export default function LoyaltyPage() {
    const { lang } = useTranslation();
    const isRtl = lang === 'ar';
    const [activeTab, setActiveTab] = useState('settings');

    const [program, setProgram] = useState<LoyaltyProgram | null>(null);
    const [loadingProgram, setLoadingProgram] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: 'برنامج الولاء',
        pointsPerCurrency: '1',
        pointsValue: '0.01',
        minRedeemPoints: '100',
        expiryMonths: '',
        isActive: true,
    });

    const [customers, setCustomers] = useState<CustomerPointsRecord[]>([]);
    const [loadingCustomers, setLoadingCustomers] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 20;

    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchProgram = useCallback(async () => {
        setLoadingProgram(true);
        try {
            const res = await fetch('/api/loyalty');
            if (res.ok) {
                const data = await res.json();
                if (data) {
                    setProgram(data);
                    setForm({
                        name: data.name || 'برنامج الولاء',
                        pointsPerCurrency: String(data.pointsPerCurrency),
                        pointsValue: String(data.pointsValue),
                        minRedeemPoints: String(data.minRedeemPoints),
                        expiryMonths: data.expiryMonths ? String(data.expiryMonths) : '',
                        isActive: data.isActive,
                    });
                }
            }
        } catch {
        } finally {
            setLoadingProgram(false);
        }
    }, []);

    const fetchCustomers = useCallback(async () => {
        setLoadingCustomers(true);
        try {
            const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
            if (search) params.set('search', search);
            const res = await fetch(`/api/loyalty/customers?${params}`);
            if (res.ok) {
                const data = await res.json();
                setCustomers(data.records || []);
                setTotal(data.total || 0);
            }
        } catch {
        } finally {
            setLoadingCustomers(false);
        }
    }, [page, search]);

    useEffect(() => { fetchProgram(); }, [fetchProgram]);

    useEffect(() => {
        if (activeTab === 'customers') fetchCustomers();
    }, [activeTab, fetchCustomers]);

    useEffect(() => {
        if (activeTab === 'customers') {
            setPage(1);
        }
    }, [search, activeTab]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                name: form.name,
                pointsPerCurrency: parseFloat(form.pointsPerCurrency) || 1,
                pointsValue: parseFloat(form.pointsValue) || 0.01,
                minRedeemPoints: parseInt(form.minRedeemPoints) || 100,
                expiryMonths: form.expiryMonths ? parseInt(form.expiryMonths) : null,
                isActive: form.isActive,
            };
            const res = await fetch('/api/loyalty', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                showToast('تم حفظ إعدادات برنامج الولاء بنجاح');
                fetchProgram();
            } else {
                const d = await res.json();
                showToast(d.error || 'فشل في الحفظ', 'error');
            }
        } catch {
            showToast('خطأ في الاتصال بالسيرفر', 'error');
        } finally {
            setSaving(false);
        }
    };

    const customerColumns: TableColumn[] = [
        {
            header: 'العميل',
            type: 'text',
            cell: (r: CustomerPointsRecord) => (
                <div>
                    <div style={{ fontWeight: 600, color: C.textPrimary, fontSize: '13px' }}>{r.customer?.name || '—'}</div>
                    {r.customer?.phone && (
                        <div style={{ fontSize: '11px', color: C.textMuted, fontFamily: OUTFIT, marginTop: '2px' }}>{r.customer.phone}</div>
                    )}
                </div>
            ),
        },
        {
            header: 'الرصيد الحالي',
            type: 'number',
            cell: (r: CustomerPointsRecord) => (
                <span style={{ fontFamily: OUTFIT, fontWeight: 700, color: C.primary, fontSize: '14px' }}>
                    {Number(r.balance).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </span>
            ),
        },
        {
            header: 'إجمالي المكتسب',
            type: 'number',
            cell: (r: CustomerPointsRecord) => (
                <span style={{ fontFamily: OUTFIT, color: '#4ade80', fontWeight: 600, fontSize: '13px' }}>
                    {Number(r.totalEarned).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </span>
            ),
        },
        {
            header: 'إجمالي المستخدم',
            type: 'number',
            cell: (r: CustomerPointsRecord) => (
                <span style={{ fontFamily: OUTFIT, color: C.textSecondary, fontWeight: 600, fontSize: '13px' }}>
                    {Number(r.totalRedeemed).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </span>
            ),
        },
        {
            header: 'آخر تحديث',
            type: 'date',
            cell: (r: CustomerPointsRecord) => (
                <span style={{ fontFamily: OUTFIT, color: C.textMuted, fontSize: '12px' }}>
                    {new Date(r.updatedAt).toLocaleDateString('en-ZA')}
                </span>
            ),
        },
    ];

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ ...PAGE_BASE, fontFamily: CAIRO }}>
                <PageHeader
                    title="نقاط الولاء"
                    subtitle="إدارة برنامج الولاء وأرصدة نقاط العملاء"
                    icon={Gift}
                />

                {toast && (
                    <div style={{
                        position: 'fixed', bottom: '24px', insetInlineStart: '24px',
                        background: toast.type === 'success' ? '#10b981' : '#ef4444',
                        color: '#fff', padding: '12px 24px', borderRadius: '10px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.2)', display: 'flex',
                        alignItems: 'center', gap: '10px', zIndex: 9999, fontSize: '13px', fontWeight: 600,
                        fontFamily: CAIRO,
                    }}>
                        {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        {toast.msg}
                    </div>
                )}

                <div style={{
                    display: 'flex', gap: '4px', marginBottom: '24px',
                    background: C.card, border: `1px solid ${C.border}`,
                    borderRadius: '14px', padding: '6px',
                }}>
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    padding: '10px 20px', borderRadius: '10px', border: 'none',
                                    background: active ? C.primary : 'transparent',
                                    color: active ? '#fff' : C.textSecondary,
                                    fontWeight: active ? 700 : 600, fontSize: '13px',
                                    cursor: 'pointer', transition: 'all 0.2s', fontFamily: CAIRO,
                                }}
                                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {activeTab === 'settings' && (
                    <div style={{
                        background: C.card, border: `1px solid ${C.border}`,
                        borderRadius: '16px', padding: '28px',
                    }}>
                        {loadingProgram ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', gap: '12px', color: C.textMuted }}>
                                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: C.primary }} />
                                جاري التحميل...
                            </div>
                        ) : (
                            <form onSubmit={handleSave}>
                                <div style={{ marginBottom: '24px' }}>
                                    <h2 style={{ fontSize: '15px', fontWeight: 700, color: C.primary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Settings size={16} /> إعدادات برنامج الولاء
                                    </h2>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                    <div>
                                        <label style={LS}>اسم البرنامج <span style={{ color: C.danger }}>*</span></label>
                                        <input
                                            required
                                            style={IS}
                                            value={form.name}
                                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                            onFocus={focusIn}
                                            onBlur={focusOut}
                                            placeholder="برنامج الولاء"
                                        />
                                    </div>
                                    <div>
                                        <label style={LS}>حالة البرنامج</label>
                                        <button
                                            type="button"
                                            onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                                            style={{
                                                width: '100%', height: '42px', borderRadius: '10px',
                                                border: `1px solid ${form.isActive ? '#4ade8050' : C.border}`,
                                                background: form.isActive ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.02)',
                                                color: form.isActive ? '#4ade80' : C.textSecondary,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                fontWeight: 700, fontSize: '13px', fontFamily: CAIRO, cursor: 'pointer',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            {form.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                            {form.isActive ? 'البرنامج مفعّل' : 'البرنامج معطّل'}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                    <div>
                                        <label style={LS}>نقاط لكل وحدة عملة <span style={{ color: C.danger }}>*</span></label>
                                        <input
                                            required
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            style={{ ...IS, fontFamily: OUTFIT }}
                                            value={form.pointsPerCurrency}
                                            onChange={e => setForm(f => ({ ...f, pointsPerCurrency: e.target.value }))}
                                            onFocus={focusIn}
                                            onBlur={focusOut}
                                            placeholder="1"
                                        />
                                    </div>
                                    <div>
                                        <label style={LS}>قيمة النقطة (بالعملة) <span style={{ color: C.danger }}>*</span></label>
                                        <input
                                            required
                                            type="number"
                                            min="0.001"
                                            step="0.001"
                                            style={{ ...IS, fontFamily: OUTFIT }}
                                            value={form.pointsValue}
                                            onChange={e => setForm(f => ({ ...f, pointsValue: e.target.value }))}
                                            onFocus={focusIn}
                                            onBlur={focusOut}
                                            placeholder="0.01"
                                        />
                                    </div>
                                    <div>
                                        <label style={LS}>الحد الأدنى للاستبدال (نقاط) <span style={{ color: C.danger }}>*</span></label>
                                        <input
                                            required
                                            type="number"
                                            min="1"
                                            style={{ ...IS, fontFamily: OUTFIT }}
                                            value={form.minRedeemPoints}
                                            onChange={e => setForm(f => ({ ...f, minRedeemPoints: e.target.value }))}
                                            onFocus={focusIn}
                                            onBlur={focusOut}
                                            placeholder="100"
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '32px' }}>
                                    <div>
                                        <label style={LS}>انتهاء النقاط (بالأشهر — اختياري)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            style={{ ...IS, fontFamily: OUTFIT }}
                                            value={form.expiryMonths}
                                            onChange={e => setForm(f => ({ ...f, expiryMonths: e.target.value }))}
                                            onFocus={focusIn}
                                            onBlur={focusOut}
                                            placeholder="مثال: 12 (تنتهي بعد سنة)"
                                        />
                                    </div>
                                    <div style={{
                                        background: 'rgba(37,106,244,0.06)', border: `1px solid rgba(37,106,244,0.2)`,
                                        borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px',
                                    }}>
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: C.primary }}>ملخص الإعدادات الحالية</span>
                                        <div style={{ fontSize: '12px', color: C.textSecondary, lineHeight: 1.8 }}>
                                            كل <span style={{ fontFamily: OUTFIT, fontWeight: 700, color: C.textPrimary }}>{form.pointsPerCurrency || '1'}</span> نقطة لكل وحدة عملة،
                                            قيمة النقطة = <span style={{ fontFamily: OUTFIT, fontWeight: 700, color: C.textPrimary }}>{form.pointsValue || '0.01'}</span> وحدة،
                                            أدنى استبدال <span style={{ fontFamily: OUTFIT, fontWeight: 700, color: C.textPrimary }}>{form.minRedeemPoints || '100'}</span> نقطة
                                            {form.expiryMonths ? <>, تنتهي بعد <span style={{ fontFamily: OUTFIT, fontWeight: 700, color: C.textPrimary }}>{form.expiryMonths}</span> شهر</> : <>, لا تنتهي النقاط</>}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        style={{
                                            height: '44px', padding: '0 32px', borderRadius: '12px',
                                            background: saving ? 'rgba(37,106,244,0.3)' : C.primary,
                                            color: saving ? C.textMuted : '#fff',
                                            border: 'none', fontWeight: 700, fontSize: '14px', fontFamily: CAIRO,
                                            cursor: saving ? 'not-allowed' : 'pointer', display: 'flex',
                                            alignItems: 'center', gap: '8px', transition: 'all 0.2s',
                                        }}
                                    >
                                        {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
                                        {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}

                {activeTab === 'customers' && (
                    <div>
                        <div style={SEARCH_STYLE.container}>
                            <div style={SEARCH_STYLE.wrapper}>
                                <Search size={SEARCH_STYLE.iconSize} style={SEARCH_STYLE.icon()} />
                                <input
                                    type="text"
                                    placeholder="ابحث باسم العميل أو رقم الهاتف..."
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                                    style={SEARCH_STYLE.input}
                                    onFocus={focusIn}
                                    onBlur={focusOut}
                                />
                            </div>
                        </div>

                        <DataTable
                            columns={customerColumns}
                            data={customers}
                            emptyIcon={Users}
                            emptyMessage={search ? 'لا توجد نتائج مطابقة' : 'لا يوجد عملاء لديهم نقاط حالياً'}
                            isLoading={loadingCustomers}
                            loadingSkeleton={
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', gap: '12px', color: C.textMuted }}>
                                    <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: C.primary }} />
                                    جاري التحميل...
                                </div>
                            }
                        />
                        {!loadingCustomers && total > 0 && (
                            <Pagination
                                total={total}
                                pageSize={pageSize}
                                currentPage={page}
                                onPageChange={setPage}
                            />
                        )}
                    </div>
                )}
            </div>
            <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </DashboardLayout>
    );
}
