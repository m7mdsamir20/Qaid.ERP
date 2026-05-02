'use client';
import { Currency } from '@/components/Currency';
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';
import { Plus, Search, Loader2, Building2, Banknote, Printer, Receipt, CreditCard, Trash2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { THEME, C, CAIRO, OUTFIT, IS, focusIn, focusOut, TABLE_STYLE, SEARCH_STYLE } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useCurrency } from '@/hooks/useCurrency';
import { getCurrencySymbol, formatNumber } from '@/lib/currency';

interface PaymentVoucher {
    id: string; voucherNumber: number; date: string;
    supplier: { id: string; name: string } | null;
    treasury: { id: string; name: string; type: string } | null;
    amount: number; paymentType: string; description?: string;
}

interface Supplier { id: string; name: string; balance: number; }
interface Treasury { id: string; name: string; type: string; balance: number; }

export default function PurchasePaymentsPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const router = useRouter();
    const { symbol: cSymbol } = useCurrency();
    const [vouchers, setVouchers] = useState<PaymentVoucher[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [treasuries, setTreasuries] = useState<Treasury[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const isAdmin = session?.user?.role === 'admin';
    const perms = (session?.user as any)?.permissions || {};
    const canCreate = isAdmin || perms['/purchase-payments']?.create;

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [vovRes, suppRes, treaRes] = await Promise.all([
                fetch('/api/purchase-payments'),
                fetch('/api/suppliers'),
                fetch('/api/treasuries'),
            ]);
            const vList: PaymentVoucher[] = await vovRes.json();
            setVouchers(Array.isArray(vList) ? vList : []);
            setSuppliers(await suppRes.json());
            setTreasuries(await treaRes.json());
        } catch { } finally { setLoading(false); }
    }, []);
    useEffect(() => { fetchData(); }, [fetchData]);

    const filtered = vouchers.filter(v => {
        const matchSearch = (v.supplier?.name || '').includes(searchTerm) || String(v.voucherNumber).includes(searchTerm) || (v.description || '').includes(searchTerm);
        const vDate = new Date(v.date);
        const matchFrom = !dateFrom || vDate >= new Date(dateFrom);
        const matchTo = !dateTo || vDate <= new Date(dateTo + 'T23:59:59');
        return matchSearch && matchFrom && matchTo;
    });

    const fmt = (num: number) => formatNumber(num);

    const printPayVoucher = (voucher: any, supplier: any, voucherNumber: number, form: any) => {
        const date = new Date(form.date || new Date()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const amount = formatNumber(voucher.amount || 0);
        const COMPANY = {
            name: 'شركة النور للتجارة', nameEn: 'Al-Nour Trading Company',
            address: 'القاهرة، مصر - شارع التحرير، عمارة 12',
            phone: '01000000000  |  01100000000',
            email: 'info@alnour.com', tax: '123-456-789', logo: '',
        };

        const html = `<!DOCTYPE html>
<html lang="ar" dir={isRtl ? 'rtl' : 'ltr'}>
<head><meta charset="UTF-8"/><title>سند صرف - PMT-${String(voucherNumber).padStart(5, '0')}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#1e293b;font-size:13px;direction:rtl;background:#fff}
  .page{width:148mm;min-height:105mm;margin:10mm auto;padding:10mm 12mm;border:2px solid #256af4;border-radius:12px;display:flex;flex-direction:column;gap:14px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:2px dashed #e2e8f0}
  .logo-box{width:50px;height:50px;border-radius:10px;background:linear-gradient(135deg,#256af4,#256af4);display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:900;overflow:hidden}
  .logo-area{display:flex;gap:10px;align-items:center}
  .company-info h1{font-size:15px;font-weight:900;color:#256af4;margin-bottom:2px}
  .company-info p{font-size:10px;color:#64748b;line-height:1.6}
  .badge-area{text-align:left}
  .badge-type{display:inline-block;background:#eff6ff;color:#1e40af;padding:4px 14px;border-radius:20px;font-size:13px;font-weight:800;margin-bottom:6px}
  .badge-num{font-size:22px;font-weight:900;color:#256af4;font-family:monospace;text-align:left}
  .badge-date{font-size:11px;color:#64748b;text-align:left;margin-top:2px}
  .amount-box{background:linear-gradient(135deg,#eff6ff,#dbeafe);border:2px solid #256af4;border-radius:10px;padding:14px 20px;text-align:center}
  .amount-label{font-size:12px;color:#64748b;font-weight:600;margin-bottom:4px}
  .amount-value{font-size:32px;font-weight:900;color:#1d4ed8}
  .amount-words{font-size:11px;color:#64748b;margin-top:4px}
  .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .meta-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px}
  .meta-card .title{font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px}
  .ml{display:flex;justify-content:space-between;align-items:center;margin-bottom:3px}
  .ml:last-child{margin-bottom:0}
  .mk{font-size:11px;color:#64748b} .mv{font-size:11px;color:#1e293b;font-weight:700}
  .desc-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;font-size:12px;color:#475569}
  .desc-box strong{color:#1e293b}
  .footer{display:flex;justify-content:space-between;align-items:flex-end;padding-top:10px;border-top:1px dashed #e2e8f0;margin-top:auto}
  .sig{text-align:center;min-width:100px}
  .sig .sl{font-size:10px;color:#94a3b8;margin-bottom:24px}
  .sig .ss{border-top:1px solid #cbd5e1;padding-top:3px;font-size:10px;color:#64748b}
  .cf{text-align:center;font-size:10px;color:#94a3b8;line-height:1.7}
  .cf strong{color:#64748b}
  @media print{body{margin:0}.page{margin:5mm auto;border-width:3px}@page{size:A5 landscape;margin:0}}
</style></head>
<body>
<div class="page">
  <div class="header">
    <div class="logo-area">
      <div class="logo-box">${COMPANY.logo ? `<img src="${COMPANY.logo}" style="width:100%;height:100%;object-fit:contain"/>` : COMPANY.name.charAt(0)}</div>
      <div class="company-info">
        <h1>${COMPANY.name}</h1>
        <p style="color:#64748b;font-size:10px">${COMPANY.nameEn}</p>
        <p>${COMPANY.phone}</p>
        <p>${COMPANY.email}</p>
      </div>
    </div>
    <div class="badge-area">
      <div><span class="badge-type">📤 سند صرف</span></div>
      <div class="badge-num">PMT-${String(voucherNumber).padStart(5, '0')}</div>
      <div class="badge-date">${date}</div>
    </div>
  </div>
  <div class="amount-box">
    <div class="amount-label">المبلغ المصروف</div>
    <div class="amount-value">${amount} ج.م</div>
    ${form.description ? `<div class="amount-words">${form.description}</div>` : ''}
  </div>
  <div class="meta-grid">
    <div class="meta-card">
      <div class="title">بيانات المورد</div>
      <div class="ml"><span class="mk">الاسم</span><span class="mv">${supplier?.name || '—'}</span></div>
      ${supplier?.phone ? `<div class="ml"><span class="mk">الهاتف</span><span class="mv">${supplier.phone}</span></div>` : ''}
      <div class="ml">
        <span class="mk">الرصيد بعد السند</span>
        <span class="mv" style="color:${((supplier?.balance || 0) + (voucher.amount || 0)) >= 0 ? '#166534' : '#dc2626'}">
          ${formatNumber(((supplier?.balance || 0) + (voucher.amount || 0)))} ج.م
        </span>
      </div>
    </div>
    <div class="meta-card">
      <div class="title">تفاصيل السند</div>
      <div class="ml"><span class="mk">رقم السند</span><span class="mv" style="font-family:monospace">PMT-${String(voucherNumber).padStart(5, '0')}</span></div>
      <div class="ml"><span class="mk">التاريخ</span><span class="mv">${date}</span></div>
      <div class="ml"><span class="mk">طريقة الدفع</span><span class="mv">${form.paymentType === 'cash' ? 'نقدي' : 'تحويل بنكي'}</span></div>
      <div class="ml"><span class="mk">الخزينة</span><span class="mv">${voucher.treasury?.name || '—'}</span></div>
    </div>
  </div>
  <div class="footer">
    <div class="sig"><div class="sl">توقيع المورد</div><div class="ss">الاسم والتوقيع</div></div>
    <div class="cf"><strong>${COMPANY.name}</strong><br/>${COMPANY.address}<br/><span style="color:#256af4;font-weight:700">سند رسمي معتمد</span></div>
    <div class="sig"><div class="sl">توقيع المُصرِف</div><div class="ss">الاسم والتوقيع</div></div>
  </div>
</div>
<script>window.onload=()=>window.print();</script>
</body></html>`;

        const win = window.open('', '_blank');
        if (win) { win.document.write(html); win.document.close(); }
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '30px' }}>
                <PageHeader
                    title="سندات الصرف"
                    subtitle="إدارة المدفوعات النقدية والبنكية للموردين — تتبع المنصرف من الخزينة والبنوك"
                    icon={CreditCard}
                    primaryButton={canCreate ? {
                        label: "سند صرف جديد",
                        onClick: () => router.push('/purchase-payments/new'),
                        icon: Plus
                    } : undefined}
                />

                <div className="mobile-column" style={{ ...SEARCH_STYLE.container, alignItems: 'stretch' }}>
                    <div style={SEARCH_STYLE.wrapper}>
                        <Search size={16} style={SEARCH_STYLE.icon(C.primary)} />
                        <input 
                            placeholder="ابحث برقم السند أو اسم المورد..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={SEARCH_STYLE.input} 
                            onFocus={focusIn} onBlur={focusOut}
                        />
                    </div>
                    {/* Responsive Date Filters */}
                    {/* Responsive Date Filters */}
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
                                display: 'flex', alignItems: 'center', gap: '6px', padding: '0 12px', height: '36px',
                                background: 'transparent', border: `1px solid ${C.danger}40`, color: C.danger, 
                                borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: '0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = `${C.danger}10`}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <Trash2 size={14} /> مسح
                        </button>
                    )}
                </div>

                {/* ── Table Section ── */}
                <div style={TABLE_STYLE.container}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', textAlign: 'center' }}>
                            <Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: C.primary, margin: '0 auto' }} />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ padding: '70px', textAlign: 'center' }}>
                            <Receipt size={36} style={{ color: C.textMuted, opacity: 0.3, display: 'block', margin: '0 auto 10px' }} />
                            <p style={{ fontSize: '15px', fontWeight: 500, color: C.textSecondary, margin: 0 }}>لا توجد سندات صرف</p>
                        </div>
                    ) : (
                        <div className="scroll-table">
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={TABLE_STYLE.th(true)}>رقم السند</th>
                                        <th style={TABLE_STYLE.th(false, true)}>التاريخ</th>
                                        <th style={TABLE_STYLE.th(false)}>المورد</th>
                                        <th style={TABLE_STYLE.th(false, true)}>طريقة الدفع</th>
                                        <th style={TABLE_STYLE.th(false)}>الخزينة / البنك</th>
                                        <th style={TABLE_STYLE.th(false)}>البيان</th>
                                        <th style={{ ...TABLE_STYLE.th(false, true), }}>المبلغ</th>
                                        <th style={TABLE_STYLE.th(false, true)}>إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((v, idx) => (
                                        <tr key={v.id} 
                                            style={TABLE_STYLE.row(idx === filtered.length - 1)}
                                            onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ ...TABLE_STYLE.td(true), fontWeight: 600, fontSize: '11px', color: C.primary, opacity: 0.65, fontFamily: CAIRO, width: '120px' }}>
                                                PMT-{String(v.voucherNumber).padStart(5, '0')}
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false, true), color: C.textSecondary, fontSize: '12px', fontFamily: CAIRO }}>
                                                {new Date(v.date).toLocaleDateString('en-GB')}
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), fontWeight: 600, color: C.textPrimary, fontSize: '13px' }}>
                                                {v.supplier?.name || '—'}
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                <div style={{ 
                                                    display: 'inline-flex', alignItems: 'center', gap: '5px', 
                                                    padding: '3px 10px', borderRadius: '30px', fontSize: '11px', fontWeight: 700,
                                                    background: v.treasury?.type === 'bank' ? 'rgba(37, 106, 244, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                    color: v.treasury?.type === 'bank' ? '#60a5fa' : '#10b981',
                                                    border: `1px solid ${v.treasury?.type === 'bank' ? '#60a5fa' : '#10b981'}30`, fontFamily: CAIRO
                                                }}>
                                                    {v.treasury?.type === 'bank' ? 'بنكي' : 'نقدي'}
                                                </div>
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), fontSize: '12px', color: C.textSecondary }}>
                                                {v.treasury?.name || '—'}
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), fontSize: '12px', color: C.textSecondary, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {v.description || '—'}
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false, true),  color: '#fb7185', fontWeight: 700, fontFamily: CAIRO }}>
                                                <Currency amount={v.amount} />
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); printPayVoucher(v, suppliers.find(s => s.id === v.supplier?.id), v.voucherNumber, { paymentType: v.paymentType, date: v.date, description: v.description }); }}
                                                        style={{ background: 'transparent', border: 'none', color: "#64748b", cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }}
                                                        onMouseEnter={e => e.currentTarget.style.color = C.primary}
                                                        onMouseLeave={e => e.currentTarget.style.color = "#64748b"}
                                                        title="طباعة">
                                                        <Printer size={16} />
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
                
            </div>
        </DashboardLayout>
    );
}
