'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';
import {
    Plus, Search, Loader2,
    Building2, Banknote,
    Printer, Receipt, Trash2, TrendingUp
} from 'lucide-react';

import { THEME, C, CAIRO, INTER, IS, focusIn, focusOut, TABLE_STYLE, SEARCH_STYLE } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import PageHeader from '@/components/PageHeader';
import { useCurrency } from '@/hooks/useCurrency';

/* ── Types ── */
interface Voucher {
    id: string; voucherNumber: number; date: string; amount: number;
    description: string; paymentType?: 'cash' | 'bank';
    customer?: { id: string; name: string };
    supplier?: { id: string; name: string };
    partnerType?: 'customer' | 'supplier';
    treasury?: { id: string; name: string; type: string; bankName?: string };
}
interface Customer { id: string; name: string; balance: number; }
interface Treasury { id: string; name: string; type: string; balance: number; bankName?: string; }

export default function ReceiptVouchersPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
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

    const fmt = (num: number) => num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const handlePrint = (v: Voucher) => {
        window.open(`/print/voucher/${v.id}`, '_blank');
    };


    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '30px' }}>
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
                <div style={SEARCH_STYLE.container}>
                    <div style={SEARCH_STYLE.wrapper}>
                        <Search size={16} style={SEARCH_STYLE.icon(C.primary)} />
                        <input 
                            placeholder={t("ابحث برقم السند أو اسم العميل...")} 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={SEARCH_STYLE.input} 
                            onFocus={focusIn} onBlur={focusOut}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ color: C.textMuted, fontSize: '12px' }}>{t('من')}</span>
                        <div style={{ width: '160px' }}>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...IS, height: '36px', borderRadius: '6px', fontSize: '13px', fontFamily: CAIRO, background: C.card, color: C.textSecondary }} />
                        </div>
                        <span style={{ color: C.textMuted, fontSize: '12px' }}>{t('إلى')}</span>
                        <div style={{ width: '160px' }}>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...IS, height: '36px', borderRadius: '6px', fontSize: '13px', fontFamily: CAIRO, background: C.card, color: C.textSecondary }} />
                        </div>
                    </div>
                    
                    {(searchTerm || dateFrom || dateTo) && (
                        <button 
                            onClick={() => { setSearchTerm(''); setDateFrom(''); setDateTo(''); }}
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '6px', padding: '0 12px', height: '36px',
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
                <div style={TABLE_STYLE.container}>
                    {loading ? (
                        <div style={{ padding: '60px', textAlign: 'center' }}>
                            <Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: C.primary, margin: '0 auto' }} />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ padding: '70px', textAlign: 'center' }}>
                            <Receipt size={36} style={{ color: C.textMuted, opacity: 0.3, display: 'block', margin: '0 auto 10px' }} />
                            <p style={{ fontSize: '15px', fontWeight: 500, color: C.textSecondary, margin: 0 }}>{t('لا توجد سندات قبض')}</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={TABLE_STYLE.th(true)}>{t('رقم السند')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false), textAlign: isRtl ? 'right' : 'left' }}>{t('التاريخ')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false), textAlign: isRtl ? 'right' : 'left' }}>{t('العميل')}</th>
                                        <th style={TABLE_STYLE.th(false)}>{t('طريقة الدفع')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false), textAlign: isRtl ? 'right' : 'left' }}>{t('الخزينة / البنك')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false), textAlign: isRtl ? 'right' : 'left' }}>{t('البيان')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false), textAlign: 'center' }}>{t('المبلغ')}</th>
                                        <th style={TABLE_STYLE.th(false)}>{t('إجراءات')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((v, idx) => (
                                        <tr key={v.id} 
                                            style={TABLE_STYLE.row(idx === filtered.length - 1)}
                                            onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ ...TABLE_STYLE.td(true), fontWeight: 800, fontSize: '11px', color: C.primary, opacity: 0.65, fontFamily: CAIRO, width: '120px' }}>
                                                {v.partnerType === 'supplier' ? 'SUP' : 'CUS'}-{String(v.voucherNumber).padStart(5, '0')}
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), color: C.textSecondary, fontSize: '12px', fontFamily: CAIRO, textAlign: isRtl ? 'right' : 'left' }}>
                                                {new Date(v.date).toLocaleDateString('en-GB')}
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), fontWeight: 600, color: C.textPrimary, fontSize: '13px', textAlign: isRtl ? 'right' : 'left' }}>
                                                {v.customer?.name || (v.supplier?.name || '—')}
                                            </td>
                                            <td style={TABLE_STYLE.td(false)}>
                                                <div style={{ 
                                                    display: 'inline-flex', alignItems: 'center', gap: '5px', 
                                                    padding: '3px 10px', borderRadius: '30px', fontSize: '11px', fontWeight: 700,
                                                    background: v.treasury?.type === 'bank' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                    color: v.treasury?.type === 'bank' ? '#60a5fa' : '#10b981',
                                                    border: `1px solid ${v.treasury?.type === 'bank' ? '#60a5fa' : '#10b981'}30`, fontFamily: CAIRO
                                                }}>
                                                    {v.treasury?.type === 'bank' ? t('بنكي') : t('نقدي')}
                                                </div>
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), fontSize: '12px', color: C.textSecondary, textAlign: isRtl ? 'right' : 'left' }}>
                                                {v.treasury?.name || '—'}
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), fontSize: '12px', color: C.textMuted, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: isRtl ? 'right' : 'left' }}>
                                                {v.description || '—'}
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center', color: C.success, fontWeight: 700, fontFamily: CAIRO }}>
                                                {fmt(v.amount)} <span style={{ fontSize: '10px', opacity: 0.6, fontFamily: CAIRO }}>{cSymbol}</span>
                                            </td>
                                            <td style={TABLE_STYLE.td(false)}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handlePrint(v); }}
                                                            style={TABLE_STYLE.actionBtn()}
                                                            title={t("طباعة")}>
                                                            <Printer size={TABLE_STYLE.actionIconSize} />
                                                        </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                <style jsx global>{`
                    @keyframes spin { to { transform:rotate(360deg); } }
                    input[type="date"]::-webkit-calendar-picker-indicator {
                        cursor: pointer;
                        opacity: 0.45;
                        transition: opacity 0.2s;
                    }
                    input[type="date"]::-webkit-calendar-picker-indicator:hover {
                        opacity: 1;
                    }
                `}</style>
            </div>
        </DashboardLayout>
    );
}
