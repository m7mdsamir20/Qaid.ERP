'use client';
import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import { C, CAIRO, OUTFIT, IS, TABLE_STYLE, SEARCH_STYLE } from '@/constants/theme';
import { FileText, Plus, Search, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ServiceContract {
    id: string;
    contractNumber: number;
    type: string;
    startDate: string;
    endDate: string | null;
    contractValue: number;
    billingCycle: string;
    status: string;
    customer: { id: string; name: string } | null;
}

const TYPE_LABELS: Record<string, string> = {
    maintenance: 'صيانة',
    consulting: 'استشارات',
    development: 'تطوير',
    support: 'دعم فني',
};

const BILLING_LABELS: Record<string, string> = {
    monthly: 'شهري',
    quarterly: 'ربع سنوي',
    semi_annual: 'نصف سنوي',
    annual: 'سنوي',
};

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string; border: string }> = {
    draft: { label: 'مسودة', bg: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: 'rgba(255,255,255,0.15)' },
    active: { label: 'نشط', bg: 'rgba(74,222,128,0.12)', color: '#4ade80', border: 'rgba(74,222,128,0.22)' },
    expired: { label: 'منتهي', bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.22)' },
    cancelled: { label: 'ملغى', bg: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: 'rgba(255,255,255,0.15)' },
};

function fmtDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtNum(n: number) {
    return n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ServiceContractsPage() {
    const router = useRouter();
    const [contracts, setContracts] = useState<ServiceContract[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/service-contracts');
            if (res.ok) setContracts(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

    const filtered = contracts.filter(c => {
        const padded = `SC-${String(c.contractNumber).padStart(5, '0')}`;
        const matchSearch =
            padded.toLowerCase().includes(search.toLowerCase()) ||
            (c.customer?.name || '').toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || c.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <DashboardLayout>
            <div dir="rtl" style={{ paddingBottom: '60px', fontFamily: CAIRO }}>
                <PageHeader
                    title="عقود الخدمة"
                    subtitle="إدارة عقود الخدمة والصيانة والدعم الفني"
                    icon={FileText}
                    primaryButton={{
                        label: 'عقد خدمة جديد',
                        onClick: () => router.push('/service-contracts/new'),
                        icon: Plus,
                    }}
                />

                {/* Filters */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                        <Search size={16} style={SEARCH_STYLE.icon()} />
                        <input
                            type="text"
                            placeholder="ابحث برقم العقد أو اسم العميل..."
                            style={{ ...SEARCH_STYLE.input, paddingInlineStart: '42px' }}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '6px', background: '#0e172a', padding: '4px', borderRadius: '12px', border: `1px solid ${C.border}` }}>
                        {[
                            { id: 'all', label: 'الكل' },
                            { id: 'draft', label: 'مسودة' },
                            { id: 'active', label: 'نشط' },
                            { id: 'expired', label: 'منتهي' },
                            { id: 'cancelled', label: 'ملغى' },
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setStatusFilter(f.id)}
                                style={{
                                    padding: '0 14px', height: '32px', borderRadius: '8px',
                                    border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                                    fontFamily: CAIRO, transition: 'all 0.2s',
                                    background: statusFilter === f.id ? C.primary : 'transparent',
                                    color: statusFilter === f.id ? '#fff' : C.textSecondary,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div style={TABLE_STYLE.container}>
                    <table style={TABLE_STYLE.table}>
                        <thead style={TABLE_STYLE.thead}>
                            <tr>
                                {['رقم العقد', 'العميل', 'نوع الخدمة', 'من', 'إلى', 'قيمة العقد', 'دورية الفوترة', 'الحالة'].map((h, i) => (
                                    <th key={i} style={TABLE_STYLE.th(i === 0)}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '60px', color: C.textMuted }}>
                                        <Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: C.primary, margin: '0 auto', display: 'block' }} />
                                    </td>
                                </tr>
                            ) : paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '60px', color: C.textMuted, fontFamily: CAIRO }}>
                                        لا توجد عقود خدمة مطابقة
                                    </td>
                                </tr>
                            ) : paginated.map((c, idx) => {
                                const badge = STATUS_BADGE[c.status] || STATUS_BADGE.draft;
                                const padded = `SC-${String(c.contractNumber).padStart(5, '0')}`;
                                const isLast = idx === paginated.length - 1;
                                return (
                                    <tr
                                        key={c.id}
                                        style={{ ...TABLE_STYLE.row(isLast), cursor: 'pointer' }}
                                        onClick={() => router.push(`/service-contracts/${c.id}`)}
                                        onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <td style={TABLE_STYLE.td(true)}>
                                            <span style={{ fontFamily: OUTFIT, fontWeight: 700, color: C.primary, fontSize: '13px' }}>{padded}</span>
                                        </td>
                                        <td style={TABLE_STYLE.td(false)}>
                                            <span style={{ fontWeight: 600, color: C.textPrimary }}>{c.customer?.name || '—'}</span>
                                        </td>
                                        <td style={TABLE_STYLE.td(false)}>
                                            <span style={{ color: C.textSecondary, fontSize: '13px' }}>{TYPE_LABELS[c.type] || c.type}</span>
                                        </td>
                                        <td style={TABLE_STYLE.td(false)}>
                                            <span style={{ fontFamily: OUTFIT, color: C.textSecondary, fontSize: '13px' }}>{fmtDate(c.startDate)}</span>
                                        </td>
                                        <td style={TABLE_STYLE.td(false)}>
                                            <span style={{ fontFamily: OUTFIT, color: C.textSecondary, fontSize: '13px' }}>{fmtDate(c.endDate)}</span>
                                        </td>
                                        <td style={TABLE_STYLE.td(false)}>
                                            <span style={{ fontFamily: OUTFIT, fontWeight: 600, color: C.textPrimary }}>{fmtNum(c.contractValue)}</span>
                                        </td>
                                        <td style={TABLE_STYLE.td(false)}>
                                            <span style={{ color: C.textSecondary, fontSize: '13px' }}>{BILLING_LABELS[c.billingCycle] || c.billingCycle}</span>
                                        </td>
                                        <td style={TABLE_STYLE.td(false)}>
                                            <span style={{
                                                display: 'inline-block', padding: '3px 12px', borderRadius: '30px',
                                                fontSize: '12px', fontWeight: 600, fontFamily: CAIRO,
                                                background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
                                            }}>{badge.label}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {!loading && filtered.length > 0 && (
                    <Pagination
                        total={filtered.length}
                        pageSize={pageSize}
                        currentPage={currentPage}
                        onPageChange={setCurrentPage}
                    />
                )}
            </div>
            <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </DashboardLayout>
    );
}
