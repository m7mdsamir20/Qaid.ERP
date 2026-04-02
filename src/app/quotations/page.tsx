'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
    FileText, Plus, Search, Eye, Trash2, Loader2, 
    CheckCircle2, Clock, AlertCircle, ShoppingCart, Printer, Send
} from 'lucide-react';
import { THEME, C, CAIRO, INTER, IS, LS, focusIn, focusOut, TABLE_STYLE, SEARCH_STYLE } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import { useRouter } from 'next/navigation';
import { CompanyInfo, printQuotation } from '@/lib/printInvoices';
import { useCurrency } from '@/hooks/useCurrency';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Quotation {
    id: string;
    quotationNumber: number;
    customer?: { id: string; name: string; phone?: string; address?: string; balance: number };
    date: string;
    total: number;
    subtotal: number;
    discount: number;
    status: string;
    notes?: string;
    lines: any[];
}

export default function QuotationsPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const { symbol: cSymbol } = useCurrency();
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [company, setCompany] = useState<CompanyInfo>({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [quoRes, comRes] = await Promise.all([
                fetch('/api/quotations'),
                fetch('/api/company')
            ]);
            if (quoRes.ok) {
                const data = await quoRes.json();
                setQuotations(data.quotations || []);
            }
            if (comRes.ok) {
                setCompany(await comRes.json());
            }
        } catch (error) {
            console.error('Failed to fetch quotations:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filteredAll = quotations.filter(quo => {
        const matchesSearch =
            String(quo.quotationNumber).includes(searchTerm) ||
            (quo.customer?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

        const quoDate = new Date(quo.date);
        const matchesFrom = dateFrom ? quoDate >= new Date(dateFrom) : true;
        const matchesTo = dateTo ? quoDate <= new Date(dateTo) : true;

        return matchesSearch && matchesFrom && matchesTo;
    });

    const paginated = filteredAll.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, dateFrom, dateTo]);

    const fmt = (num: number) => num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const getStatusStyle = (status: string) => {
        if (status === 'converted') return { bg: 'rgba(74,222,128,0.1)', color: '#4ade80', text: 'تم التحويل لفاتورة', icon: CheckCircle2 };
        if (status === 'cancelled') return { bg: 'rgba(251,113,133,0.1)', color: '#fb7185', text: 'ملغي', icon: AlertCircle };
        return { bg: 'rgba(251,191,36,0.1)', color: '#fbbf24', text: 'قيد الانتظار', icon: Clock };
    };

    const handleDelete = async (id: string, num: number) => {
        if (!confirm(`هل أنت متأكد من حذف عرض السعر رقم ${num}؟`)) return;
        try {
            const res = await fetch(`/api/quotations?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchData();
            } else {
                alert('فشل حذف عرض السعر');
            }
        } catch (error) {
            alert('خطأ في الاتصال بالسيرفر');
        }
    };

    return (
        <DashboardLayout>
            <div dir="rtl" style={{ paddingBottom: '60px', background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>
                
                <PageHeader 
                    title="عروض الأسعار"
                    subtitle="إدارة عروض الأسعار المقدمة للعملاء وتحويلها لفواتير"
                    icon={FileText}
                    primaryButton={{
                        label: "عرض سعر جديد",
                        onClick: () => router.push('/quotations/new'),
                        icon: Plus
                    }}
                />

                {/* Toolbar */}
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap' }}>
                   
                    <div style={SEARCH_STYLE.wrapper}>
                        <Search size={SEARCH_STYLE.iconSize} style={SEARCH_STYLE.icon(C.primary)} />
                        <input
                            type="text"
                            placeholder="ابحث برقم العرض أو اسم العميل..."
                            style={SEARCH_STYLE.input}
                            onFocus={focusIn}
                            onBlur={focusOut}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                         <div style={{ position: 'relative' }}>
                            <input 
                                type="date" 
                                value={dateFrom} 
                                onChange={e => setDateFrom(e.target.value)}
                                style={{ ...IS, width: '150px', fontSize: '12px', padding: '0 12px', height: '40px' }} 
                            />
                            <span style={{ position: 'absolute', top: '-8px', right: '10px', fontSize: '10px', background: C.bg, padding: '0 4px', color: C.textMuted }}>من تاريخ</span>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <input 
                                type="date" 
                                value={dateTo} 
                                onChange={e => setDateTo(e.target.value)}
                                style={{ ...IS, width: '150px', fontSize: '12px', padding: '0 12px', height: '40px' }} 
                            />
                            <span style={{ position: 'absolute', top: '-8px', right: '10px', fontSize: '10px', background: C.bg, padding: '0 4px', color: C.textMuted }}>إلى تاريخ</span>
                        </div>
                    </div>
                </div>

                <div style={TABLE_STYLE.container}>
                    {loading ? (
                        <div style={{ padding: '60px', textAlign: 'center' }}>
                            <Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: C.primary, margin: '0 auto' }} />
                        </div>
                    ) : filteredAll.length === 0 ? (
                        <div style={{ padding: '80px', textAlign: 'center' }}>
                            <FileText size={48} style={{ color: C.textMuted, opacity: 0.2, margin: '0 auto 15px' }} />
                            <p style={{ fontSize: '16px', fontWeight: 500, color: C.textSecondary, margin: 0 }}>
                                {searchTerm ? 'لا توجد نتائج بحث مطابقة' : 'لا يوجد عروض أسعار مسجلة حالياً'}
                            </p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                             <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={TABLE_STYLE.th(true)}>رقم العرض</th>
                                        <th style={TABLE_STYLE.th(false)}>العميل</th>
                                        <th style={TABLE_STYLE.th(false)}>التاريخ</th>
                                        <th style={TABLE_STYLE.th(false)}>الإجمالي</th>
                                        <th style={TABLE_STYLE.th(false)}>الحالة</th>
                                        <th style={TABLE_STYLE.th(false)}>إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.map((quo, idx) => {
                                        const status = getStatusStyle(quo.status);
                                        return (
                                            <tr key={quo.id} style={TABLE_STYLE.row(idx === paginated.length - 1)}>
                                                <td style={{ ...TABLE_STYLE.td(true), fontWeight: 800, color: C.primary, fontFamily: INTER }}>
                                                    #{quo.quotationNumber}
                                                </td>
                                                <td style={TABLE_STYLE.td(false)}>
                                                    <span style={{ fontWeight: 600 }}>{quo.customer?.name || 'عميل نقدي'}</span>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontSize: '13px', fontFamily: INTER, color: C.textMuted }}>
                                                    {new Date(quo.date).toLocaleDateString('ar-EG')}
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontWeight: 800, color: C.textPrimary, fontFamily: INTER }}>
                                                    {fmt(quo.total)} <small style={{ fontFamily: CAIRO, fontSize: '10px', opacity: 0.7 }}>{cSymbol}</small>
                                                </td>
                                                <td style={TABLE_STYLE.td(false)}>
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: '30px', fontSize: '11px', fontWeight: 700,
                                                        background: status.bg, color: status.color, border: `1px solid ${status.color}33`
                                                    }}>
                                                        <status.icon size={13} />
                                                        {status.text}
                                                    </span>
                                                </td>
                                                <td style={TABLE_STYLE.td(false)}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        <button onClick={() => router.push(`/quotations/${quo.id}`)} style={TABLE_STYLE.actionBtn(C.primary)} title="عرض / تعديل"><Eye size={16} /></button>
                                                        <button onClick={() => printQuotation(quo, company)} style={TABLE_STYLE.actionBtn(C.success)} title="طباعة"><Printer size={16} /></button>
                                                        <button onClick={() => handleDelete(quo.id, quo.quotationNumber)} style={TABLE_STYLE.actionBtn(C.danger)} title="حذف"><Trash2 size={16} /></button>
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
            </div>
            <style jsx global>{` @keyframes spin { to { transform:rotate(360deg); } } `}</style>
        </DashboardLayout>
    );
}
