'use client';
import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import CustomSelect from '@/components/CustomSelect';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import { useTranslation } from '@/lib/i18n';
import {
    Calculator, Loader2, CheckCircle2, DollarSign,
    BadgeCheck, AlertCircle, TrendingUp
} from 'lucide-react';
import {
    C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut,
    PAGE_BASE, BTN_PRIMARY, TABLE_STYLE
} from '@/constants/theme';
import StatCard, { StatCardGrid } from '@/components/StatCard';

interface Commission {
    id: string;
    salesRepId: string;
    salesRep?: { id: string; name: string; code?: string };
    year: number;
    month: number;
    totalSales: number;
    collectedAmount: number;
    baseAmount: number;
    rate: number;
    amount: number;
    status: string;
}

interface Treasury { id: string; name: string; balance?: number; }

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    calculated: { label: 'محسوبة', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
    approved: { label: 'معتمدة', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
    paid: { label: 'مصروفة', color: C.success, bg: 'rgba(74,222,128,0.1)' }
};

const MONTHS_AR = [
    'يناير','فبراير','مارس','أبريل','مايو','يونيو',
    'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'
];

export default function CommissionsPage() {
    const { t } = useTranslation();
    const now = new Date();

    const [commissions, setCommissions] = useState<Commission[]>([]);
    const [treasuries, setTreasuries] = useState<Treasury[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCalculating, setIsCalculating] = useState(false);
    const [payItem, setPayItem] = useState<Commission | null>(null);
    const [payTreasury, setPayTreasury] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState('');

    const [year, setYear] = useState(String(now.getFullYear()));
    const [month, setMonth] = useState(String(now.getMonth() + 1));

    const fetchCommissions = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ year, month });
            const res = await fetch(`/api/commissions?${params}`);
            if (res.ok) setCommissions(await res.json());
        } catch { } finally { setLoading(false); }
    }, [year, month]);

    useEffect(() => {
        fetchCommissions();
        fetch('/api/treasuries').then(r => r.ok ? r.json() : []).then(d => setTreasuries(d.treasuries || d));
    }, []);

    useEffect(() => { fetchCommissions(); }, [fetchCommissions]);

    const handleCalculate = async () => {
        setIsCalculating(true); setError('');
        try {
            const res = await fetch('/api/commissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ year: parseInt(year), month: parseInt(month) })
            });
            if (res.ok) fetchCommissions();
            else { const d = await res.json(); setError(d.error || 'فشل الحساب'); }
        } catch { setError('فشل في الاتصال'); }
        finally { setIsCalculating(false); }
    };

    const handleApprove = async (id: string) => {
        setActionLoading(id);
        try {
            const res = await fetch(`/api/commissions/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve' })
            });
            if (res.ok) fetchCommissions();
        } catch { }
        finally { setActionLoading(null); }
    };

    const handlePay = async () => {
        if (!payItem || !payTreasury) { setError('يرجى اختيار الخزينة'); return; }
        setActionLoading(payItem.id);
        try {
            const res = await fetch(`/api/commissions/${payItem.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'pay', treasuryId: payTreasury })
            });
            if (res.ok) { setPayItem(null); setPayTreasury(''); fetchCommissions(); }
            else { const d = await res.json(); setError(d.error || 'فشل الصرف'); }
        } catch { setError('فشل في الاتصال'); }
        finally { setActionLoading(null); }
    };

    const totalCommissions = commissions.reduce((s, c) => s + Number(c.amount), 0);
    const totalSalesBase = commissions.reduce((s, c) => s + Number(c.totalSales), 0);

    const columns: TableColumn[] = [
        {
            header: 'المندوب',
            cell: (row: Commission) => (
                <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: C.textPrimary, fontFamily: CAIRO }}>{row.salesRep?.name || '—'}</p>
                    {row.salesRep?.code && <p style={{ margin: 0, fontSize: '11px', color: C.primary, fontFamily: OUTFIT }}>{row.salesRep.code}</p>}
                </div>
            )
        },
        {
            header: 'إجمالي المبيعات',
            type: 'number',
            cell: (row: Commission) => (
                <span style={{ fontFamily: OUTFIT, fontWeight: 600, fontSize: '13px', color: C.textPrimary }}>
                    {Number(row.totalSales).toLocaleString('ar-SA')}
                </span>
            )
        },
        {
            header: 'تم تحصيله',
            type: 'number',
            cell: (row: Commission) => (
                <span style={{ fontFamily: OUTFIT, fontWeight: 600, fontSize: '13px', color: C.textPrimary }}>
                    {Number(row.collectedAmount).toLocaleString('ar-SA')}
                </span>
            )
        },
        {
            header: 'أساس الحساب',
            type: 'number',
            cell: (row: Commission) => (
                <span style={{ fontFamily: OUTFIT, fontWeight: 600, fontSize: '13px', color: C.teal }}>
                    {Number(row.baseAmount).toLocaleString('ar-SA')}
                </span>
            )
        },
        {
            header: 'النسبة',
            type: 'number',
            cell: (row: Commission) => (
                <span style={{ fontFamily: OUTFIT, fontWeight: 700, fontSize: '13px', color: C.warning }}>
                    {row.rate}%
                </span>
            )
        },
        {
            header: 'العمولة',
            type: 'number',
            cell: (row: Commission) => (
                <span style={{ fontFamily: OUTFIT, fontWeight: 800, fontSize: '14px', color: C.success }}>
                    {Number(row.amount).toLocaleString('ar-SA')}
                </span>
            )
        },
        {
            header: 'الحالة',
            type: 'status',
            cell: (row: Commission) => {
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
            cell: (row: Commission) => (
                <div style={{ display: 'flex', gap: '6px' }}>
                    {row.status === 'calculated' && (
                        <button
                            onClick={() => handleApprove(row.id)}
                            disabled={actionLoading === row.id}
                            style={{ ...TABLE_STYLE.actionBtn('#fbbf24'), whiteSpace: 'nowrap', width: 'auto', padding: '0 10px', fontSize: '11px', fontFamily: CAIRO, gap: '4px', display: 'flex', alignItems: 'center' }}
                            title="اعتماد"
                        >
                            {actionLoading === row.id ? <Loader2 size={12} style={{ animation: 'spin 1.2s linear infinite' }} /> : <><CheckCircle2 size={12} /> اعتماد</>}
                        </button>
                    )}
                    {row.status === 'approved' && (
                        <button
                            onClick={() => { setPayItem(row); setPayTreasury(''); setError(''); }}
                            disabled={actionLoading === row.id}
                            style={{ ...TABLE_STYLE.actionBtn(C.success), whiteSpace: 'nowrap', width: 'auto', padding: '0 10px', fontSize: '11px', fontFamily: CAIRO, gap: '4px', display: 'flex', alignItems: 'center' }}
                            title="صرف"
                        >
                            {actionLoading === row.id ? <Loader2 size={12} style={{ animation: 'spin 1.2s linear infinite' }} /> : <><DollarSign size={12} /> صرف</>}
                        </button>
                    )}
                </div>
            )
        }
    ];

    const yearOptions = Array.from({ length: 5 }, (_, i) => {
        const y = now.getFullYear() - 2 + i;
        const ys = String(y);
        return { value: ys, label: ys[0] + '⁠' + ys.slice(1) };
    });

    return (
        <DashboardLayout>
            <div dir="rtl" style={PAGE_BASE}>
                <PageHeader
                    title="العمولات"
                    subtitle="حساب واعتماد وصرف عمولات مناديب المبيعات"
                    icon={Calculator}
                />

                {/* KPI — يستخدم StatCard الموحّد */}
                {!loading && (
                    <StatCardGrid cols={3}>
                        <StatCard
                            label="إجمالي المبيعات"
                            value={totalSalesBase.toLocaleString('ar-SA')}
                            icon={<TrendingUp size={18} />}
                            color={C.primary}
                        />
                        <StatCard
                            label="إجمالي العمولات"
                            value={totalCommissions.toLocaleString('ar-SA')}
                            icon={<DollarSign size={18} />}
                            color={C.success}
                        />
                        <StatCard
                            label="عدد المناديب"
                            value={commissions.length}
                            suffix="مندوب"
                            icon={<BadgeCheck size={18} />}
                            color={C.warning}
                        />
                    </StatCardGrid>
                )}

                {/* Filters + Calculate */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
                    <div style={{ minWidth: '120px' }}>
                        <CustomSelect
                            value={year}
                            onChange={setYear}
                            style={{ background: C.card }}
                            options={yearOptions}
                        />
                    </div>
                    <div style={{ minWidth: '140px' }}>
                        <CustomSelect
                            value={month}
                            onChange={setMonth}
                            style={{ background: C.card }}
                            options={MONTHS_AR.map((m, i) => ({ value: String(i + 1), label: m }))}
                        />
                    </div>
                    <button
                        onClick={handleCalculate}
                        disabled={isCalculating}
                        style={{
                            height: '42px', padding: '0 20px', borderRadius: '10px', border: 'none',
                            background: isCalculating ? `${C.primary}40` : C.primary,
                            color: '#fff', fontWeight: 700, fontSize: '13px',
                            cursor: isCalculating ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO
                        }}
                    >
                        {isCalculating ? <Loader2 size={16} style={{ animation: 'spin 1.2s linear infinite' }} /> : <Calculator size={16} />}
                        احسب العمولات
                    </button>
                </div>

                {error && (
                    <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: C.danger, fontSize: '13px', fontFamily: CAIRO, marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <AlertCircle size={14} /> {error}
                    </div>
                )}

                <DataTable
                    columns={columns}
                    data={commissions}
                    emptyIcon={Calculator}
                    emptyMessage="لا توجد عمولات لهذا الشهر — اضغط «احسب العمولات» لبدء الحساب"
                    isLoading={loading}
                    loadingSkeleton={
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: C.textSecondary }}>
                            <Loader2 size={32} style={{ animation: 'spin 1.2s linear infinite' }} />
                        </div>
                    }
                />

                {/* Total Row */}
                {!loading && commissions.length > 0 && (
                    <div style={{ marginTop: '12px', padding: '12px 20px', background: `${C.primary}10`, border: `1px solid ${C.primary}30`, borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: CAIRO, fontWeight: 700, color: C.primary, fontSize: '13px' }}>الإجمالي</span>
                        <span style={{ fontFamily: OUTFIT, fontWeight: 800, color: C.success, fontSize: '16px' }}>
                            {totalCommissions.toLocaleString('ar-SA')}
                        </span>
                    </div>
                )}

                {/* Pay Modal */}
                <AppModal
                    show={!!payItem}
                    onClose={() => { setPayItem(null); setError(''); }}
                    title="صرف العمولة"
                    icon={DollarSign}
                    maxWidth="380px"
                >
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, marginBottom: '16px' }}>
                            <p style={{ margin: '0 0 4px', fontFamily: CAIRO, fontSize: '12px', color: C.textSecondary }}>{payItem?.salesRep?.name}</p>
                            <p style={{ margin: 0, fontFamily: OUTFIT, fontSize: '22px', fontWeight: 800, color: C.success }}>
                                {Number(payItem?.amount || 0).toLocaleString('ar-SA')}
                            </p>
                        </div>
                        <label style={LS}>الخزينة <span style={{ color: C.danger }}>*</span></label>
                        <CustomSelect
                            value={payTreasury}
                            onChange={setPayTreasury}
                            placeholder="اختر الخزينة..."
                            style={{ background: C.card }}
                            options={treasuries.map(tr => ({ value: tr.id, label: tr.name }))}
                        />
                    </div>
                    {error && (
                        <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: C.danger, fontSize: '13px', fontFamily: CAIRO, marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={handlePay} disabled={!!actionLoading} style={{ ...BTN_PRIMARY(false, !!actionLoading), flex: 1, height: '44px' }}>
                            {actionLoading ? <Loader2 size={16} style={{ animation: 'spin 1.2s linear infinite' }} /> : 'تأكيد الصرف'}
                        </button>
                        <button onClick={() => { setPayItem(null); setError(''); }} style={{ height: '44px', padding: '0 20px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>
                            إلغاء
                        </button>
                    </div>
                </AppModal>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}` }} />
        </DashboardLayout>
    );
}
