'use client';
import { formatNumber } from '@/lib/currency';
import { Currency } from '@/components/Currency';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';
import { Plus, Search, Loader2, Building2, Banknote, Printer, Receipt, Trash2, TrendingUp, Eye } from 'lucide-react';

import { THEME, C, CAIRO, OUTFIT, IS, focusIn, focusOut, TABLE_STYLE, SEARCH_STYLE } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import PageHeader from '@/components/PageHeader';
import { useCurrency } from '@/hooks/useCurrency';
import { printVoucherDirectly } from '@/lib/printDirectly';
import { DataTable } from '@/components/DataTable';


/* ── Types ── */
interface Voucher {
    id: string; voucherNumber: number; date: string; amount: number;
    description: string; paymentType?: 'cash' | 'bank';
    customer?: { id: string; name: string };
    treasury?: { id: string; name: string; type: string; bankName?: string };
}
interface Customer { id: string; name: string; balance: number; }
interface Treasury { id: string; name: string; type: string; balance: number; bankName?: string; }

export default function ReceiptVouchersPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const isContracting = (session?.user as any)?.businessType?.toUpperCase() === 'CONTRACTING';
    const router = useRouter();
    const { symbol: cSymbol } = useCurrency();
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [treasuries, setTreasuries] = useState<Treasury[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const isAdmin = session?.user?.role === 'admin';
    const perms = (session?.user as any)?.permissions || {};
    const canCreate = isAdmin || perms['/receipts']?.create;

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [vovRes, custRes, treaRes] = await Promise.all([
                fetch('/api/vouchers?type=receipt'),
                fetch('/api/customers'),
                fetch('/api/treasuries'),
            ]);
            const vList: Voucher[] = await vovRes.json();
            setVouchers(Array.isArray(vList) ? vList : []);
            setCustomers(await custRes.json());
            setTreasuries(await treaRes.json());
        } catch { } finally { setLoading(false); }
    }, []);
    useEffect(() => { fetchData(); }, [fetchData]);

    const filtered = vouchers.filter(v => {
        const matchSearch = (v.customer?.name || '').includes(searchTerm) || String(v.voucherNumber).includes(searchTerm) || (v.description || '').includes(searchTerm);
        const vDate = new Date(v.date);
        const matchFrom = !dateFrom || vDate >= new Date(dateFrom);
        const matchTo = !dateTo || vDate <= new Date(dateTo + 'T23:59:59');
        return matchSearch && matchFrom && matchTo;
    });

    const handlePrint = (v: Voucher) => {
        printVoucherDirectly(v.id)
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '30px', background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>
                <PageHeader
                    title={t("سندات القبض")}
                    subtitle={t("إدارة المتحصلات النقدية والبنكية من العملاء — تتبع التوريدات للخزينة والبنوك")}
                    icon={TrendingUp}
                    primaryButton={canCreate ? {
                        label: t("سند قبض جديد"),
                        onClick: () => router.push('/receipts/new'),
                        icon: Plus
                    } : undefined}
                />

                {/* Search + Filters */}
                <div className="mobile-column" style={{ ...SEARCH_STYLE.container, alignItems: 'stretch' }}>
                    <div style={SEARCH_STYLE.wrapper}>
                        <Search size={16} style={SEARCH_STYLE.icon(C.primary)} />
                        <input
                            placeholder={isContracting ? t("ابحث برقم السند أو اسم صاحب المشروع...") : t("ابحث برقم السند أو اسم العميل...")}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={SEARCH_STYLE.input}
                            onFocus={focusIn} onBlur={focusOut}
                        />
                    </div>
                    
                    <div className="mobile-flex-row mobile-gap-sm date-filter-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className="date-label-desktop" style={{ color: C.textSecondary, fontSize: '12px' }}>{t("من")}</span>
                        <div className="date-input-wrapper">
                            <span className="date-label-mobile" style={{ display: 'none' }}>{t("من")}</span>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...IS, width: '160px' }} />
                        </div>
                        <span className="date-label-desktop" style={{ color: C.textSecondary, fontSize: '12px' }}>{t("إلى")}</span>
                        <div className="date-input-wrapper">
                            <span className="date-label-mobile" style={{ display: 'none' }}>{t("إلى")}</span>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...IS, width: '160px' }} />
                        </div>
                    </div>

                    {(searchTerm || dateFrom || dateTo) && (
                        <button
                            className="mobile-full"
                            onClick={() => { setSearchTerm(''); setDateFrom(''); setDateTo(''); }}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0 12px', height: '36px',
                                background: 'transparent', border: `1px solid ${C.danger}40`, color: C.danger,
                                borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: '0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = `${C.danger}10`}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <Trash2 size={14} /> {t('مسح')}
                        </button>
                    )}
                </div>

                {/* ── Table Section ── */}
                <DataTable
                    columns={[
                        { header: t('رقم السند'), type: 'text', cell: (row) => <span style={{ fontWeight: 600, fontSize: '11px', color: C.primary, opacity: 0.65, fontFamily: OUTFIT }}>RCP-{String(row.voucherNumber).padStart(5, '0')}</span> },
                        { header: t('التاريخ'), type: 'date', cell: (row) => <span style={{ color: C.textSecondary, fontSize: '12px', fontFamily: OUTFIT }}>{new Date(row.date).toLocaleDateString('en-GB')}</span> },
                        { header: isContracting ? t('المالك / صاحب المشروع') : t('العميل'), type: 'text', cell: (row) => <span style={{ fontWeight: 600, color: C.textPrimary, fontSize: '13px', fontFamily: CAIRO }}>{row.customer?.name || '—'}</span> },
                        { header: t('طريقة الدفع'), type: 'status', cell: (row) => (
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: '5px',
                                padding: '3px 10px', borderRadius: '30px', fontSize: '11px', fontWeight: 700,
                                background: row.treasury?.type === 'bank' ? 'rgba(37, 106, 244, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                color: row.treasury?.type === 'bank' ? '#60a5fa' : '#10b981',
                                border: `1px solid ${row.treasury?.type === 'bank' ? '#60a5fa' : '#10b981'}30`, fontFamily: CAIRO
                            }}>
                                {row.treasury?.type === 'bank' ? t('بنكي') : t('نقدي')}
                            </div>
                        )},
                        { header: t('الخزينة / البنك'), type: 'text', cell: (row) => <span style={{ fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO }}>{row.treasury?.name || '—'}</span> },
                        { header: t('البيان'), type: 'text', cell: (row) => <span style={{ fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO }}>{row.description || '—'}</span>, style: { maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                        { header: t('المبلغ'), type: 'number', cell: (row) => <span style={{ color: C.success, fontWeight: 700, fontFamily: OUTFIT }}><Currency amount={row.amount} /></span> },
                        { header: t('إجراءات'), type: 'action', cell: (row) => (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button onClick={(e) => { e.stopPropagation(); handlePrint(row); }} style={TABLE_STYLE.actionBtn()} title={t("طباعة")}><Printer size={TABLE_STYLE.actionIconSize} /></button>
                                <button onClick={(e) => { e.stopPropagation(); router.push(`/receipts/${row.id}`); }} style={TABLE_STYLE.actionBtn()} title={t("عرض")}><Eye size={TABLE_STYLE.actionIconSize} /></button>
                            </div>
                        )},
                    ]}
                    data={filtered}
                    emptyIcon={Receipt}
                    emptyMessage={t('لا توجد سندات قبض')}
                    isLoading={loading}
                    loadingSkeleton={
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', textAlign: 'center' }}>
                            <Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: C.primary, margin: '0 auto' }} />
                        </div>
                    }
                />
                
            </div>
            
        </DashboardLayout>
    );
}
