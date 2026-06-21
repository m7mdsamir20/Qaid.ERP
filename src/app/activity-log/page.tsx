'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import CustomSelect from '@/components/CustomSelect';
import TableSkeleton from '@/components/TableSkeleton';
import { useSession } from 'next-auth/react';
import { useTranslation } from '@/lib/i18n';
import {
    History, Search, Filter, Eye, EyeOff, User, Calendar,
    ChevronDown, ChevronUp,
} from 'lucide-react';
import { C, CAIRO, OUTFIT, IS, PAGE_BASE, SC, focusIn, focusOut, TABLE_STYLE } from '@/constants/theme';
import { TableColumn } from '@/components/EmptyTableState';

/* ─── Constants ─── */

const MODULE_LABELS: Record<string, string> = {
    'invoices': 'فواتير المبيعات',
    'purchases': 'فواتير المشتريات',
    'purchase-orders': 'أوامر الشراء',
    'sales-orders': 'أوامر البيع',
    'employees': 'الموظفين',
    'attendance': 'الحضور والانصراف',
    'leaves': 'الإجازات',
    'payrolls': 'مسير الرواتب',
    'customers': 'العملاء',
    'suppliers': 'الموردين',
    'items': 'الأصناف',
    'warehouses': 'المخازن',
    'accounts': 'الحسابات',
    'journal-entries': 'القيود اليومية',
    'vouchers': 'السندات',
    'service-contracts': 'عقود الخدمة',
    'work-orders': 'أوامر العمل',
    'material-requests': 'طلبات المواد',
    'projects': 'المشاريع',
    'settings': 'الإعدادات',
    'auth': 'تسجيل الدخول',
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
    'create':  { label: 'إنشاء',     color: '#22c55e' },
    'update':  { label: 'تعديل',     color: '#3b82f6' },
    'delete':  { label: 'حذف',       color: '#ef4444' },
    'login':   { label: 'دخول',      color: '#6b7280' },
    'logout':  { label: 'خروج',      color: '#6b7280' },
    'approve': { label: 'اعتماد',    color: '#8b5cf6' },
    'reject':  { label: 'رفض',       color: '#f59e0b' },
    'print':   { label: 'طباعة',     color: '#f97316' },
    'export':  { label: 'تصدير',     color: '#f97316' },
    'receive': { label: 'استلام',    color: '#14b8a6' },
};

/* ─── Types ─── */

interface ActivityLogEntry {
    id: string;
    userId: string | null;
    userName: string | null;
    action: string;
    module: string;
    entityType: string | null;
    entityId: string | null;
    entityRef: string | null;
    description: string;
    oldData: any;
    newData: any;
    ipAddress: string | null;
    userAgent: string | null;
    companyId: string | null;
    branchId: string | null;
    createdAt: string;
}

interface ApiResponse {
    logs: ActivityLogEntry[];
    total: number;
    page: number;
    limit: number;
}

/* ─── Helpers ─── */

function formatDateTime(isoStr: string): string {
    const d = new Date(isoStr);
    const dd   = String(d.getDate()).padStart(2, '0');
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh   = String(d.getHours()).padStart(2, '0');
    const min  = String(d.getMinutes()).padStart(2, '0');
    const ss   = String(d.getSeconds()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
}

function truncate(str: string, len: number): string {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '…' : str;
}

/* ─── Expandable Row Detail ─── */

function ExpandedDetail({ log }: { log: ActivityLogEntry }) {
    return (
        <tr>
            <td
                colSpan={6}
                style={{
                    padding: '0',
                    borderBottom: `1px solid ${C.border}`,
                }}
            >
                <div
                    style={{
                        background: 'rgba(37,106,244,0.04)',
                        borderTop: `1px solid ${C.border}`,
                        padding: '16px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        fontFamily: CAIRO,
                        fontSize: '12px',
                        color: C.textSecondary,
                    }}
                >
                    {/* Full description */}
                    <div>
                        <span style={{ fontWeight: 700, color: C.textPrimary, marginInlineEnd: '8px' }}>التفاصيل الكاملة:</span>
                        <span>{log.description}</span>
                    </div>

                    {/* IP address */}
                    {log.ipAddress && (
                        <div>
                            <span style={{ fontWeight: 700, color: C.textPrimary, marginInlineEnd: '8px' }}>عنوان IP:</span>
                            <span style={{ fontFamily: OUTFIT }}>{log.ipAddress}</span>
                        </div>
                    )}

                    {/* Entity info */}
                    {(log.entityType || log.entityRef) && (
                        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                            {log.entityType && (
                                <div>
                                    <span style={{ fontWeight: 700, color: C.textPrimary, marginInlineEnd: '8px' }}>النوع:</span>
                                    <span>{log.entityType}</span>
                                </div>
                            )}
                            {log.entityRef && (
                                <div>
                                    <span style={{ fontWeight: 700, color: C.textPrimary, marginInlineEnd: '8px' }}>المرجع:</span>
                                    <span style={{ fontFamily: OUTFIT }}>{log.entityRef}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Old / New data diff */}
                    {(log.oldData || log.newData) && (
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: log.oldData && log.newData ? '1fr 1fr' : '1fr',
                                gap: '12px',
                                marginTop: '4px',
                            }}
                        >
                            {log.oldData && (
                                <div>
                                    <div
                                        style={{
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            color: '#ef4444',
                                            marginBottom: '6px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                background: '#ef4444',
                                            }}
                                        />
                                        قبل التغيير
                                    </div>
                                    <pre
                                        style={{
                                            margin: 0,
                                            padding: '10px 14px',
                                            background: 'rgba(239,68,68,0.06)',
                                            border: '1px solid rgba(239,68,68,0.2)',
                                            borderRadius: '8px',
                                            fontSize: '11px',
                                            color: C.textSecondary,
                                            fontFamily: OUTFIT,
                                            overflowX: 'auto',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                            direction: 'ltr',
                                            textAlign: 'left',
                                        }}
                                    >
                                        {JSON.stringify(log.oldData, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {log.newData && (
                                <div>
                                    <div
                                        style={{
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            color: '#22c55e',
                                            marginBottom: '6px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                background: '#22c55e',
                                            }}
                                        />
                                        بعد التغيير
                                    </div>
                                    <pre
                                        style={{
                                            margin: 0,
                                            padding: '10px 14px',
                                            background: 'rgba(34,197,94,0.06)',
                                            border: '1px solid rgba(34,197,94,0.2)',
                                            borderRadius: '8px',
                                            fontSize: '11px',
                                            color: C.textSecondary,
                                            fontFamily: OUTFIT,
                                            overflowX: 'auto',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                            direction: 'ltr',
                                            textAlign: 'left',
                                        }}
                                    >
                                        {JSON.stringify(log.newData, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
}

/* ─── Main Page ─── */

export default function ActivityLogPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const user = (session?.user as any) || {};
    const isAdmin = user.role === 'admin' || !!user.isSuperAdmin;

    /* State */
    const [logs,    setLogs]    = useState<ActivityLogEntry[]>([]);
    const [total,   setTotal]   = useState(0);
    const [page,    setPage]    = useState(1);
    const [loading, setLoading] = useState(true);

    const [search,     setSearch]     = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [moduleFilter, setModuleFilter] = useState('');
    const [dateFrom,   setDateFrom]   = useState('');
    const [dateTo,     setDateTo]     = useState('');
    const [userFilter, setUserFilter] = useState('');

    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const PAGE_SIZE = 25;

    /* Fetch */
    const fetchLogs = useCallback(async (p: number = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('page',  String(p));
            params.set('limit', String(PAGE_SIZE));
            if (search)       params.set('search',   search);
            if (actionFilter) params.set('action',   actionFilter);
            if (moduleFilter) params.set('module',   moduleFilter);
            if (dateFrom)     params.set('dateFrom', dateFrom);
            if (dateTo)       params.set('dateTo',   dateTo);
            if (userFilter)   params.set('userId',   userFilter);

            const res = await fetch(`/api/activity-log?${params}`);
            if (res.ok) {
                const data: ApiResponse = await res.json();
                setLogs(data.logs);
                setTotal(data.total);
                setPage(p);
            }
        } catch (e) {
            console.error('Failed to fetch activity log:', e);
        } finally {
            setLoading(false);
        }
    }, [search, actionFilter, moduleFilter, dateFrom, dateTo, userFilter]);

    useEffect(() => {
        fetchLogs(1);
    }, [fetchLogs]);

    /* Toggle expanded row */
    const toggleRow = (id: string) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    /* Select options */
    const moduleOptions = [
        { value: '', label: 'كل الموديولات' },
        ...Object.entries(MODULE_LABELS).map(([k, v]) => ({ value: k, label: v })),
    ];

    const actionOptions = [
        { value: '', label: 'كل العمليات' },
        ...Object.entries(ACTION_LABELS).map(([k, v]) => ({ value: k, label: v.label })),
    ];

    /* Table columns */
    const columns: TableColumn[] = [
        {
            header: 'التاريخ والوقت',
            cell: (row: ActivityLogEntry) => (
                <div style={{ fontFamily: OUTFIT, fontSize: '12px', color: C.textSecondary, whiteSpace: 'nowrap' }}>
                    {formatDateTime(row.createdAt)}
                </div>
            ),
        },
        {
            header: 'المستخدم',
            cell: (row: ActivityLogEntry) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '30px', height: '30px', borderRadius: '50%',
                        background: `${C.primary}20`, border: `1px solid ${C.primary}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: C.primary, flexShrink: 0,
                    }}>
                        <User size={14} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary }}>
                        {row.userName || '—'}
                    </span>
                </div>
            ),
        },
        {
            header: 'العملية',
            style: { textAlign: 'center' } as React.CSSProperties,
            cell: (row: ActivityLogEntry) => {
                const info = ACTION_LABELS[row.action] || { label: row.action, color: C.textSecondary };
                return (
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                        background: `${info.color}18`,
                        color: info.color,
                        border: `1px solid ${info.color}35`,
                        whiteSpace: 'nowrap',
                    }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                        {info.label}
                    </div>
                );
            },
        },
        {
            header: 'الموديول',
            style: { textAlign: 'center' } as React.CSSProperties,
            cell: (row: ActivityLogEntry) => (
                <span style={{
                    fontSize: '12px', fontWeight: 600, color: C.textSecondary,
                    padding: '3px 8px', background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${C.border}`, borderRadius: '6px',
                }}>
                    {MODULE_LABELS[row.module] || row.module}
                </span>
            ),
        },
        {
            header: 'التفاصيل',
            cell: (row: ActivityLogEntry) => (
                <span
                    title={row.description}
                    style={{ fontSize: '12px', color: C.textSecondary, cursor: 'default' }}
                >
                    {truncate(row.description, 60)}
                </span>
            ),
        },
        {
            header: 'عرض',
            style: { textAlign: 'center' } as React.CSSProperties,
            cell: (row: ActivityLogEntry) => {
                const isExpanded = expandedRows.has(row.id);
                return (
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleRow(row.id); }}
                        style={{
                            width: '30px', height: '30px', borderRadius: '8px',
                            border: `1px solid ${isExpanded ? C.primary + '60' : C.border}`,
                            background: isExpanded ? `${C.primary}15` : 'rgba(255,255,255,0.02)',
                            color: isExpanded ? C.primary : C.textSecondary,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s',
                        }}
                        title={isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                    >
                        {isExpanded ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                );
            },
        },
    ];

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ ...PAGE_BASE, fontFamily: CAIRO }}>

                {/* Header */}
                <PageHeader
                    title="سجل النشاط"
                    subtitle="تتبع جميع العمليات والتغييرات في النظام"
                    icon={History}
                />

                {/* Filters */}
                <div
                    className="activity-filters"
                    style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}
                >
                    {/* Search */}
                    <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                        <Search
                            size={15}
                            style={{
                                position: 'absolute', insetInlineStart: '13px', top: '50%',
                                transform: 'translateY(-50%)', color: C.primary, pointerEvents: 'none',
                            }}
                        />
                        <input
                            type="text"
                            placeholder="بحث في التفاصيل..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ ...IS, paddingInlineStart: '38px', height: '42px', fontSize: '13px', borderRadius: '10px' }}
                            onFocus={focusIn}
                            onBlur={focusOut}
                        />
                    </div>

                    {/* Module filter */}
                    <div style={{ width: '180px' }}>
                        <CustomSelect
                            value={moduleFilter}
                            onChange={setModuleFilter}
                            placeholder="كل الموديولات"
                            icon={Filter}
                            options={moduleOptions}
                        />
                    </div>

                    {/* Action filter */}
                    <div style={{ width: '150px' }}>
                        <CustomSelect
                            value={actionFilter}
                            onChange={setActionFilter}
                            placeholder="كل العمليات"
                            options={actionOptions}
                        />
                    </div>

                    {/* Date range — grouped with explicit gap from adjacent filters */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginInlineStart: '6px' }}>
                        {/* Date From */}
                        <div style={{ position: 'relative' }}>
                            <Calendar
                                size={14}
                                style={{
                                    position: 'absolute', insetInlineStart: '11px', top: '50%',
                                    transform: 'translateY(-50%)', color: C.textMuted, pointerEvents: 'none',
                                }}
                            />
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={e => setDateFrom(e.target.value)}
                                style={{
                                    ...IS, width: '150px', height: '42px',
                                    paddingInlineStart: '32px', fontSize: '12px', borderRadius: '10px',
                                }}
                                onFocus={focusIn}
                                onBlur={focusOut}
                                title="من تاريخ"
                            />
                        </div>

                        {/* Date To */}
                        <div style={{ position: 'relative' }}>
                            <Calendar
                                size={14}
                                style={{
                                    position: 'absolute', insetInlineStart: '11px', top: '50%',
                                    transform: 'translateY(-50%)', color: C.textMuted, pointerEvents: 'none',
                                }}
                            />
                            <input
                                type="date"
                                value={dateTo}
                                onChange={e => setDateTo(e.target.value)}
                                style={{
                                    ...IS, width: '150px', height: '42px',
                                    paddingInlineStart: '32px', fontSize: '12px', borderRadius: '10px',
                                }}
                                onFocus={focusIn}
                                onBlur={focusOut}
                                title="إلى تاريخ"
                            />
                        </div>
                    </div>

                    {/* Clear filters */}
                    {(search || actionFilter || moduleFilter || dateFrom || dateTo || userFilter) && (
                        <button
                            onClick={() => {
                                setSearch('');
                                setActionFilter('');
                                setModuleFilter('');
                                setDateFrom('');
                                setDateTo('');
                                setUserFilter('');
                            }}
                            style={{
                                height: '42px', padding: '0 14px', borderRadius: '10px',
                                border: `1px solid rgba(239,68,68,0.3)`, background: 'rgba(239,68,68,0.08)',
                                color: '#ef4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                fontFamily: CAIRO, whiteSpace: 'nowrap',
                            }}
                        >
                            مسح الفلاتر
                        </button>
                    )}
                </div>

                {/* Total count */}
                {!loading && (
                    <div style={{
                        fontSize: '12px', color: C.textMuted, fontFamily: CAIRO,
                        marginBottom: '10px', fontWeight: 500,
                    }}>
                        إجمالي السجلات:{' '}
                        <span style={{ fontFamily: OUTFIT, fontWeight: 700, color: C.primary }}>{total.toLocaleString()}</span>
                    </div>
                )}

                {/* Table */}
                {loading ? (
                    <TableSkeleton />
                ) : logs.length === 0 ? (
                    <div style={{
                        ...TABLE_STYLE.container,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        padding: '60px 20px', gap: '12px',
                    }}>
                        <p style={{ fontSize: '14px', color: C.textMuted, fontFamily: CAIRO, margin: 0 }}>
                            لا توجد سجلات مطابقة للبحث
                        </p>
                    </div>
                ) : (
                    <div style={TABLE_STYLE.container}>
                        <div className="scroll-table">
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        {columns.map((col, idx) => (
                                            <th
                                                key={idx}
                                                style={{
                                                    ...TABLE_STYLE.th(idx === 0, false),
                                                    ...(col.style || {}),
                                                }}
                                            >
                                                {col.header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((row, rowIdx) => {
                                        const isLast = rowIdx === logs.length - 1;
                                        const isExpanded = expandedRows.has(row.id);
                                        return (
                                            <React.Fragment key={row.id}>
                                                <tr
                                                    style={{
                                                        ...TABLE_STYLE.row(isLast && !isExpanded),
                                                        cursor: 'default',
                                                    }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                >
                                                    {columns.map((col, colIdx) => (
                                                        <td
                                                            key={colIdx}
                                                            style={{
                                                                ...TABLE_STYLE.td(colIdx === 0, false),
                                                                ...(col.style || {}),
                                                            }}
                                                        >
                                                            {col.cell ? col.cell(row, rowIdx) : null}
                                                        </td>
                                                    ))}
                                                </tr>
                                                {isExpanded && <ExpandedDetail log={row} />}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <Pagination
                            total={total}
                            pageSize={PAGE_SIZE}
                            currentPage={page}
                            onPageChange={(p) => fetchLogs(p)}
                        />
                    </div>
                )}

                <style dangerouslySetInnerHTML={{
                    __html: `
                    @media (max-width: 768px) {
                        .activity-filters {
                            flex-direction: column !important;
                            align-items: stretch !important;
                        }
                        .activity-filters > div {
                            width: 100% !important;
                            min-width: unset !important;
                        }
                        .activity-filters input[type="date"] {
                            width: 100% !important;
                        }
                    }
                    `,
                }} />
            </div>
        </DashboardLayout>
    );
}
