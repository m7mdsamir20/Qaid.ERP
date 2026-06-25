'use client';
import { formatNumber } from '@/lib/currency';
import { Currency } from '@/components/Currency';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';
import { Printer, X, Info, Receipt, TrendingDown, Plus, Search, ChevronDown, Lock, Loader2, UserCheck, Building2, Banknote, CheckCircle2, ArrowRight, Trash2, Eye, FileDown } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { THEME, C, CAIRO, OUTFIT, IS, focusIn, focusOut, PAGE_BASE, SC, STitle, TABLE_STYLE, SEARCH_STYLE } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import { useCurrency } from '@/hooks/useCurrency';
import { printVoucherDirectly, downloadVoucherPDF } from '@/lib/printDirectly';
import { DataTable } from '@/components/DataTable';


/* ── Types ── */
interface Voucher {
    id: string; voucherNumber: number; date: string; amount: number;
    description: string; paymentType: 'cash' | 'bank';
    supplier?: { id: string; name: string };
    treasury?: { id: string; name: string; type: string };
}
interface Supplier { id: string; name: string; balance: number; }
interface Treasury { id: string; name: string; type: string; balance: number; }

/* ── List Page ── */
export default function PaymentVouchersPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { symbol: cSymbol } = useCurrency();
    const { data: session } = useSession();
    const router = useRouter();
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [treasuries, setTreasuries] = useState<Treasury[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;

    const isAdmin = session?.user?.role === 'admin';
    const perms = (session?.user as any)?.permissions || {};
    const canCreate = isAdmin || perms['/payments']?.create;

    const fetchAll = useCallback(async () => {
        try {
            const [vR, sR, tR] = await Promise.all([
                fetch('/api/vouchers?type=payment'),
                fetch('/api/suppliers'),
                fetch('/api/treasuries'),
            ]);
            setVouchers(await vR.json());
            setSuppliers(await sR.json());
            setTreasuries(await tR.json());
        } catch { } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handlePrint = (v: Voucher) => {
        printVoucherDirectly(v.id)
    };

    const filteredAll = vouchers.filter(v => {
        const matchSearch = String(v.voucherNumber).includes(searchTerm) || (v.supplier?.name || '').includes(searchTerm) || (v.description || '').includes(searchTerm);
        const rDate = new Date(v.date);
        const matchFrom = !dateFrom || rDate >= new Date(dateFrom);
        const matchTo = !dateTo || rDate <= new Date(dateTo + 'T23:59:59');
        return matchSearch && matchFrom && matchTo;
    });

    const paginated = filteredAll.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, dateFrom, dateTo]);

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '60px', background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>
                <PageHeader
                    title={t("سندات الصرف")}
                    subtitle={t("إدارة المدفوعات النقدية والبنكية للموردين — تتبع المنصرف من الخزينة والبنوك")}
                    icon={TrendingDown}
                    primaryButton={canCreate ? {
                        label: t('سند صرف جديد'),
                        onClick: () => router.push('/payments/new'),
                        icon: Plus
                    } : undefined}
                />

                <div className="mobile-column" style={{ ...SEARCH_STYLE.container, alignItems: 'stretch' }}>
                    <div style={SEARCH_STYLE.wrapper}>
                        <Search size={16} style={SEARCH_STYLE.icon(C.primary)} />
                        <input 
                            placeholder={t("رقم السند أو اسم المورد...")} 
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
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
                            <Trash2 size={14} /> {t("مسح")}
                        </button>
                    )}
                </div>

                <DataTable
                    columns={[
                        { header: t("رقم السند"), type: 'text', cell: (row) => <span style={{ fontWeight: 600, fontSize: '11px', color: C.primary, opacity: 0.65, fontFamily: OUTFIT }}>{`PMT-${String(row.voucherNumber).padStart(5, '0')}`}</span> },
                        { header: t("التاريخ"), type: 'date', cell: (row) => <span style={{ color: C.textSecondary, fontSize: '13px', fontFamily: OUTFIT }}>{new Date(row.date).toLocaleDateString('en-ZA')}</span> },
                        { header: t("المورد"), type: 'text', cell: (row) => <span style={{ fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{row.supplier?.name || '—'}</span> },
                        { header: t("طريقة الدفع"), type: 'status', cell: (row) => (
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: '5px',
                                padding: '3px 10px', borderRadius: '30px', fontSize: '11px', fontWeight: 700,
                                background: row.treasury?.type === 'bank' ? 'rgba(37, 106, 244, 0.1)' : 'rgba(52, 211, 153, 0.1)',
                                color: row.treasury?.type === 'bank' ? '#60a5fa' : '#34d399',
                                border: `1px solid ${row.treasury?.type === 'bank' ? '#60a5fa' : '#34d399'}30`, fontFamily: CAIRO
                            }}>
                                {row.treasury?.type === 'bank' ? t('بنكي') : t('نقدي')}
                            </div>
                        )},
                        { header: t("الخزينة / البنك"), type: 'text', cell: (row) => <span style={{ color: C.textSecondary, fontSize: '13px', fontFamily: CAIRO }}>{row.treasury?.name || '—'}</span> },
                        { header: t("البيان"), type: 'text', cell: (row) => <span style={{ color: C.textSecondary, fontSize: '12px', fontFamily: CAIRO }}>{row.description || '—'}</span>, style: { maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                        { header: t("المبلغ"), type: 'number', cell: (row) => <span style={{ color: C.danger, fontWeight: 700, fontFamily: OUTFIT }}><Currency amount={row.amount} /></span> },
                        { header: t("إجراءات"), type: 'action', cell: (row) => (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button onClick={() => handlePrint(row)} style={TABLE_STYLE.actionBtn()} title={t("طباعة")}><Printer size={TABLE_STYLE.actionIconSize} /></button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (downloadingId === row.id) return;
                                        setDownloadingId(row.id);
                                        downloadVoucherPDF(row.id)
                                            .catch(err => alert('فشل التحميل: ' + (err?.message || '')))
                                            .finally(() => setDownloadingId(null));
                                    }}
                                    disabled={downloadingId === row.id}
                                    style={{ ...TABLE_STYLE.actionBtn(C.danger), opacity: downloadingId === row.id ? 0.5 : 1, cursor: downloadingId === row.id ? 'not-allowed' : 'pointer' }}
                                    title={t('تحميل PDF')}
                                >
                                    {downloadingId === row.id
                                        ? <Loader2 size={TABLE_STYLE.actionIconSize} style={{ animation: 'spin 1s linear infinite' }} />
                                        : <FileDown size={TABLE_STYLE.actionIconSize} />}
                                </button>
                                <button onClick={() => router.push(`/payments/${row.id}`)} style={TABLE_STYLE.actionBtn()} title={t("عرض")}><Eye size={TABLE_STYLE.actionIconSize} /></button>
                            </div>
                        )},
                    ]}
                    data={paginated}
                    emptyIcon={Receipt}
                    emptyMessage={searchTerm || dateFrom || dateTo ? t('لا توجد نتائج') : t('لا توجد سندات صرف')}
                    isLoading={loading}
                    loadingSkeleton={
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px' }}>
                            <Loader2 size={36} style={{ animation: 'spin 1.5s linear infinite', color: C.primary, display: 'block', margin: '0 auto 10px' }} />
                            <span style={{ fontSize: '13px', color: C.textSecondary, fontWeight: 600 }}>{t("جاري تحميل البيانات...")}</span>
                        </div>
                    }
                />
                <Pagination 
                    total={filteredAll.length}
                    pageSize={pageSize}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                />
            </div>
            
        </DashboardLayout>
    );
}
