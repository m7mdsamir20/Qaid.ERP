'use client';
import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import CustomSelect from '@/components/CustomSelect';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import { useSession } from 'next-auth/react';
import { useTranslation } from '@/lib/i18n';
import {
    Wallet, Plus, Loader2, AlertCircle, CreditCard,
    Banknote, ArrowDownToLine, RotateCcw
} from 'lucide-react';
import {
    C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut,
    PAGE_BASE, BTN_PRIMARY, SEARCH_STYLE, TABLE_STYLE
} from '@/constants/theme';
import StatCard, { StatCardGrid } from '@/components/StatCard';

interface Collection {
    id: string;
    date: string;
    amount: number;
    method: string;
    status: string;
    checkNumber?: string;
    bankName?: string;
    checkDueDate?: string;
    notes?: string;
    salesRep?: { id: string; name: string; code?: string };
    customer?: { id: string; name: string };
    invoice?: { id: string; invoiceNumber: number };
}

interface SalesRep { id: string; name: string; code?: string; }
interface Customer { id: string; name: string; }
interface Treasury { id: string; name: string; balance?: number; }

const METHOD_LABELS: Record<string, string> = {
    cash: 'نقدي', check: 'شيك', transfer: 'تحويل'
};
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: 'معلق', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
    deposited: { label: 'مودَع', color: C.success, bg: 'rgba(74,222,128,0.1)' },
    returned: { label: 'مرتجع', color: C.danger, bg: 'rgba(239,68,68,0.1)' }
};

const EMPTY_FORM = {
    salesRepId: '', customerId: '', invoiceId: '', date: new Date().toISOString().split('T')[0],
    amount: '', method: 'cash', checkNumber: '', bankName: '', checkDueDate: '', notes: ''
};

export default function CollectionsPage() {
    const { data: session } = useSession();
    const { t } = useTranslation();

    const isAdmin = (session?.user as any)?.role === 'admin' || (session?.user as any)?.isSuperAdmin;
    const linkedRepId = (session?.user as any)?.salesRepId;

    const [collections, setCollections] = useState<Collection[]>([]);
    const [reps, setReps] = useState<SalesRep[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [treasuries, setTreasuries] = useState<Treasury[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [filterRepId, setFilterRepId] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterMethod, setFilterMethod] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Modals
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [depositItem, setDepositItem] = useState<Collection | null>(null);
    const [formData, setFormData] = useState({ ...EMPTY_FORM });
    const [depositTreasury, setDepositTreasury] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState('');

    const fetchCollections = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterRepId) params.set('salesRepId', filterRepId);
            if (filterStatus) params.set('status', filterStatus);
            if (filterMethod) params.set('method', filterMethod);
            if (dateFrom) params.set('dateFrom', dateFrom);
            if (dateTo) params.set('dateTo', dateTo);
            const res = await fetch(`/api/collections?${params}`);
            if (res.ok) {
                const data = await res.json();
                setCollections(Array.isArray(data) ? data : (data.collections || []));
            }
        } catch { } finally { setLoading(false); }
    }, [filterRepId, filterStatus, filterMethod, dateFrom, dateTo]);

    useEffect(() => {
        fetchCollections();
        // Also fetch lookup data
        Promise.all([
            fetch('/api/sales-reps').then(r => r.ok ? r.json() : []),
            fetch('/api/customers').then(r => r.ok ? r.json() : []),
            fetch('/api/treasuries').then(r => r.ok ? r.json() : [])
        ]).then(([repsData, cusData, trData]) => {
            setReps(repsData.salesReps || repsData);
            setCustomers(cusData.customers || cusData);
            setTreasuries(trData.treasuries || trData);
        });
    }, []);

    useEffect(() => { fetchCollections(); }, [fetchCollections]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.customerId || !formData.amount) { setError('العميل والمبلغ مطلوبان'); return; }
        setIsSaving(true); setError('');
        try {
            const payload = {
                ...formData,
                amount: parseFloat(formData.amount),
                salesRepId: isAdmin ? formData.salesRepId : linkedRepId
            };
            const res = await fetch('/api/collections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) { setIsAddOpen(false); setFormData({ ...EMPTY_FORM }); fetchCollections(); }
            else { const d = await res.json(); setError(d.error || 'فشل في الحفظ'); }
        } catch { setError('فشل في الاتصال'); }
        finally { setIsSaving(false); }
    };

    const handleDeposit = async () => {
        if (!depositItem || !depositTreasury) { setError('يرجى اختيار الخزينة'); return; }
        setActionLoading(depositItem.id);
        try {
            const res = await fetch(`/api/collections/${depositItem.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'deposit', treasuryId: depositTreasury })
            });
            if (res.ok) { setDepositItem(null); setDepositTreasury(''); fetchCollections(); }
            else { const d = await res.json(); setError(d.error || 'فشل الإيداع'); }
        } catch { setError('فشل في الاتصال'); }
        finally { setActionLoading(null); }
    };

    const handleReturn = async (id: string) => {
        setActionLoading(id);
        try {
            const res = await fetch(`/api/collections/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'return' })
            });
            if (res.ok) fetchCollections();
        } catch { }
        finally { setActionLoading(null); }
    };

    const totalAmount = collections.reduce((s, c) => s + Number(c.amount), 0);
    const cashTotal = collections.filter(c => c.method === 'cash').reduce((s, c) => s + Number(c.amount), 0);
    const checkTotal = collections.filter(c => c.method === 'check').reduce((s, c) => s + Number(c.amount), 0);
    const depositedTotal = collections.filter(c => c.status === 'deposited').reduce((s, c) => s + Number(c.amount), 0);

    const kpiCards = [
        { label: 'إجمالي الشهر', value: totalAmount, color: C.primary, icon: Wallet },
        { label: 'نقدي', value: cashTotal, color: C.success, icon: Banknote },
        { label: 'شيكات', value: checkTotal, color: C.warning, icon: CreditCard },
        { label: 'مودَع', value: depositedTotal, color: C.teal, icon: ArrowDownToLine }
    ];

    const columns: TableColumn[] = [
        {
            header: 'التاريخ',
            cell: (row: Collection) => (
                <span style={{ fontFamily: OUTFIT, fontSize: '13px', color: C.textSecondary }}>
                    {new Date(row.date).toLocaleDateString('ar-EG-u-nu-latn')}
                </span>
            )
        },
        ...(isAdmin ? [{
            header: 'المندوب',
            cell: (row: Collection) => (
                <span style={{ fontFamily: CAIRO, fontSize: '13px', fontWeight: 600, color: C.textPrimary }}>
                    {row.salesRep?.name || '—'}
                </span>
            )
        }] : []),
        {
            header: 'العميل',
            cell: (row: Collection) => (
                <span style={{ fontFamily: CAIRO, fontSize: '13px', color: C.textPrimary }}>{row.customer?.name || '—'}</span>
            )
        },
        {
            header: 'المبلغ',
            type: 'number',
            cell: (row: Collection) => (
                <span style={{ fontFamily: OUTFIT, fontWeight: 700, color: C.textPrimary, fontSize: '13px' }}>
                    {Number(row.amount).toLocaleString('ar-SA')}
                </span>
            )
        },
        {
            header: 'الطريقة',
            cell: (row: Collection) => (
                <span style={{ fontFamily: CAIRO, fontSize: '12px', padding: '3px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', color: C.textSecondary }}>
                    {METHOD_LABELS[row.method] || row.method}
                </span>
            )
        },
        {
            header: 'رقم الشيك',
            cell: (row: Collection) => (
                <span style={{ fontFamily: OUTFIT, fontSize: '12px', color: C.textSecondary }}>{row.checkNumber || '—'}</span>
            )
        },
        {
            header: 'تاريخ الاستحقاق',
            cell: (row: Collection) => (
                <span style={{ fontFamily: OUTFIT, fontSize: '12px', color: C.textSecondary }}>
                    {row.checkDueDate ? new Date(row.checkDueDate).toLocaleDateString('ar-EG-u-nu-latn') : '—'}
                </span>
            )
        },
        {
            header: 'الحالة',
            type: 'status',
            cell: (row: Collection) => {
                const cfg = STATUS_CONFIG[row.status] || { label: row.status, color: C.textSecondary, bg: 'rgba(255,255,255,0.05)' };
                return (
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, fontFamily: CAIRO, background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                    </span>
                );
            }
        },
        {
            header: 'إجراء',
            type: 'action',
            cell: (row: Collection) => (
                <div style={{ display: 'flex', gap: '6px' }}>
                    {row.status === 'pending' && (
                        <button
                            onClick={() => { setDepositItem(row); setError(''); setDepositTreasury(''); }}
                            disabled={actionLoading === row.id}
                            style={TABLE_STYLE.actionBtn(C.success)}
                            title="إيداع"
                        >
                            {actionLoading === row.id ? <Loader2 size={12} style={{ animation: 'spin 1.2s linear infinite' }} /> : <ArrowDownToLine size={12} />}
                        </button>
                    )}
                    {row.status === 'deposited' && row.method === 'check' && (
                        <button
                            onClick={() => handleReturn(row.id)}
                            disabled={actionLoading === row.id}
                            style={TABLE_STYLE.actionBtn(C.danger)}
                            title="مرتجع"
                        >
                            {actionLoading === row.id ? <Loader2 size={12} style={{ animation: 'spin 1.2s linear infinite' }} /> : <RotateCcw size={12} />}
                        </button>
                    )}
                </div>
            )
        }
    ];

    return (
        <DashboardLayout>
            <div dir="rtl" style={PAGE_BASE}>
                <PageHeader
                    title="التحصيلات"
                    subtitle="متابعة تحصيلات مناديب المبيعات وإيداعها"
                    icon={Wallet}
                    primaryButton={{
                        label: 'تسجيل تحصيل جديد',
                        onClick: () => { setFormData({ ...EMPTY_FORM }); setError(''); setIsAddOpen(true); },
                        icon: Plus
                    }}
                />

                {/* KPI — يستخدم StatCard الموحّد */}
                {!loading && (
                    <StatCardGrid cols={4}>
                        <StatCard
                            label="إجمالي الشهر"
                            value={totalAmount.toLocaleString('ar-SA')}
                            icon={<Wallet size={18} />}
                            color={C.primary}
                        />
                        <StatCard
                            label="نقدي"
                            value={cashTotal.toLocaleString('ar-SA')}
                            icon={<Banknote size={18} />}
                            color={C.success}
                        />
                        <StatCard
                            label="شيكات"
                            value={checkTotal.toLocaleString('ar-SA')}
                            icon={<CreditCard size={18} />}
                            color={C.warning}
                        />
                        <StatCard
                            label="مودَع"
                            value={depositedTotal.toLocaleString('ar-SA')}
                            icon={<ArrowDownToLine size={18} />}
                            color={C.teal}
                        />
                    </StatCardGrid>
                )}

                {/* Filters */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    {isAdmin && (
                        <div style={{ minWidth: '160px' }}>
                            <CustomSelect
                                value={filterRepId}
                                onChange={setFilterRepId}
                                placeholder="كل المناديب"
                                style={{ background: C.card }}
                                options={[{ value: '', label: 'كل المناديب' }, ...reps.map(r => ({ value: r.id, label: r.name }))]}
                            />
                        </div>
                    )}
                    <div style={{ minWidth: '140px' }}>
                        <CustomSelect
                            value={filterStatus}
                            onChange={setFilterStatus}
                            placeholder="كل الحالات"
                            style={{ background: C.card }}
                            options={[
                                { value: '', label: 'كل الحالات' },
                                { value: 'pending', label: 'معلق' },
                                { value: 'deposited', label: 'مودَع' },
                                { value: 'returned', label: 'مرتجع' }
                            ]}
                        />
                    </div>
                    <div style={{ minWidth: '140px' }}>
                        <CustomSelect
                            value={filterMethod}
                            onChange={setFilterMethod}
                            placeholder="كل الطرق"
                            style={{ background: C.card }}
                            options={[
                                { value: '', label: 'كل الطرق' },
                                { value: 'cash', label: 'نقدي' },
                                { value: 'check', label: 'شيك' },
                                { value: 'transfer', label: 'تحويل' }
                            ]}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ ...LS, margin: 0, whiteSpace: 'nowrap' }}>من:</label>
                        <input type="date" style={{ ...IS, width: '140px' }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} onFocus={focusIn} onBlur={focusOut} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ ...LS, margin: 0, whiteSpace: 'nowrap' }}>إلى:</label>
                        <input type="date" style={{ ...IS, width: '140px' }} value={dateTo} onChange={e => setDateTo(e.target.value)} onFocus={focusIn} onBlur={focusOut} />
                    </div>
                </div>

                {/* Table */}
                <DataTable
                    columns={columns}
                    data={collections}
                    emptyIcon={Wallet}
                    emptyMessage="لا توجد تحصيلات"
                    isLoading={loading}
                    loadingSkeleton={
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: C.textSecondary }}>
                            <Loader2 size={32} style={{ animation: 'spin 1.2s linear infinite' }} />
                        </div>
                    }
                />

                {/* Add Collection Modal */}
                <AppModal
                    show={isAddOpen}
                    onClose={() => setIsAddOpen(false)}
                    title="تسجيل تحصيل جديد"
                    icon={Plus}
                    maxWidth="500px"
                >
                    <form onSubmit={handleAdd}>
                        {isAdmin && (
                            <div style={{ marginBottom: '16px' }}>
                                <label style={LS}>المندوب <span style={{ color: C.danger }}>*</span></label>
                                <CustomSelect
                                    value={formData.salesRepId}
                                    onChange={v => setFormData({ ...formData, salesRepId: v })}
                                    placeholder="اختر المندوب..."
                                    style={{ background: C.card }}
                                    options={reps.map(r => ({ value: r.id, label: r.name }))}
                                />
                            </div>
                        )}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={LS}>العميل <span style={{ color: C.danger }}>*</span></label>
                            <CustomSelect
                                value={formData.customerId}
                                onChange={v => setFormData({ ...formData, customerId: v })}
                                placeholder="اختر العميل..."
                                style={{ background: C.card }}
                                options={customers.map(c => ({ value: c.id, label: c.name }))}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={LS}>التاريخ</label>
                                <input type="date" style={IS} value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                            <div>
                                <label style={LS}>المبلغ <span style={{ color: C.danger }}>*</span></label>
                                <input type="number" min="0" step="0.01" style={{ ...IS, fontFamily: OUTFIT }} value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={LS}>طريقة الدفع</label>
                            <CustomSelect
                                value={formData.method}
                                onChange={v => setFormData({ ...formData, method: v })}
                                style={{ background: C.card }}
                                options={[
                                    { value: 'cash', label: 'نقدي' },
                                    { value: 'check', label: 'شيك' },
                                    { value: 'transfer', label: 'تحويل بنكي' }
                                ]}
                            />
                        </div>
                        {formData.method === 'check' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px', padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: `1px solid ${C.border}` }}>
                                <div>
                                    <label style={LS}>رقم الشيك</label>
                                    <input style={IS} value={formData.checkNumber} onChange={e => setFormData({ ...formData, checkNumber: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                                <div>
                                    <label style={LS}>اسم البنك</label>
                                    <input style={IS} value={formData.bankName} onChange={e => setFormData({ ...formData, bankName: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                                <div style={{ gridColumn: '1/-1' }}>
                                    <label style={LS}>تاريخ الاستحقاق</label>
                                    <input type="date" style={IS} value={formData.checkDueDate} onChange={e => setFormData({ ...formData, checkDueDate: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                            </div>
                        )}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={LS}>ملاحظات</label>
                            <textarea style={{ ...IS, height: '60px', padding: '10px', resize: 'none' }} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                        </div>
                        {error && (
                            <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: C.danger, fontSize: '13px', fontFamily: CAIRO, marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <AlertCircle size={14} /> {error}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="submit" disabled={isSaving} style={{ ...BTN_PRIMARY(false, isSaving), flex: 1, height: '44px' }}>
                                {isSaving ? <Loader2 size={16} style={{ animation: 'spin 1.2s linear infinite' }} /> : 'تسجيل التحصيل'}
                            </button>
                            <button type="button" onClick={() => setIsAddOpen(false)} style={{ height: '44px', padding: '0 20px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>
                                إلغاء
                            </button>
                        </div>
                    </form>
                </AppModal>

                {/* Deposit Modal */}
                <AppModal
                    show={!!depositItem}
                    onClose={() => { setDepositItem(null); setError(''); }}
                    title="إيداع التحصيل في الخزينة"
                    icon={ArrowDownToLine}
                    maxWidth="400px"
                >
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, marginBottom: '16px' }}>
                            <p style={{ margin: '0 0 4px', fontFamily: CAIRO, fontSize: '13px', color: C.textSecondary }}>المبلغ</p>
                            <p style={{ margin: 0, fontFamily: OUTFIT, fontSize: '22px', fontWeight: 800, color: C.success }}>
                                {Number(depositItem?.amount || 0).toLocaleString('ar-SA')}
                            </p>
                        </div>
                        <label style={LS}>الخزينة <span style={{ color: C.danger }}>*</span></label>
                        <CustomSelect
                            value={depositTreasury}
                            onChange={setDepositTreasury}
                            placeholder="اختر الخزينة..."
                            style={{ background: C.card }}
                            options={treasuries.map(tr => ({ value: tr.id, label: `${tr.name}${tr.balance !== undefined ? ` — ${tr.balance?.toLocaleString('ar-SA')}` : ''}` }))}
                        />
                    </div>
                    {error && (
                        <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: C.danger, fontSize: '13px', fontFamily: CAIRO, marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={handleDeposit} disabled={!!actionLoading} style={{ ...BTN_PRIMARY(false, !!actionLoading), flex: 1, height: '44px' }}>
                            {actionLoading ? <Loader2 size={16} style={{ animation: 'spin 1.2s linear infinite' }} /> : 'تأكيد الإيداع'}
                        </button>
                        <button onClick={() => { setDepositItem(null); setError(''); }} style={{ height: '44px', padding: '0 20px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>
                            إلغاء
                        </button>
                    </div>
                </AppModal>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}` }} />
        </DashboardLayout>
    );
}
