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
    'sales': 'فواتير المبيعات',
    'purchases': 'فواتير المشتريات',
    'purchase-orders': 'أوامر الشراء',
    'sales-orders': 'أوامر البيع',
    'sale-returns': 'مرتجعات المبيعات',
    'purchase-returns': 'مرتجعات المشتريات',
    'employees': 'الموظفين',
    'attendance': 'الحضور والانصراف',
    'leaves': 'الإجازات',
    'payrolls': 'مسير الرواتب',
    'customers': 'العملاء',
    'suppliers': 'الموردين',
    'items': 'الأصناف',
    'warehouses': 'المخازن',
    'warehouse-transfers': 'تحويلات المخازن',
    'accounts': 'الحسابات',
    'journal-entries': 'القيود اليومية',
    'vouchers': 'السندات',
    'service-contracts': 'عقود الخدمة',
    'service_contracts': 'عقود الخدمة',
    'work-orders': 'أوامر العمل',
    'work_orders': 'أوامر العمل',
    'material-requests': 'طلبات المواد',
    'projects': 'المشاريع',
    'settings': 'الإعدادات',
    'auth': 'تسجيل الدخول',
    'sales_reps': 'مناديب المبيعات',
    'collections': 'التحصيلات',
    'expenses': 'المصروفات',
    'advances': 'السلف',
    'deductions': 'الخصومات',
    'commissions': 'العمولات',
    'sales-targets': 'أهداف المبيعات',
    'stocktakings': 'الجرد',
    'serial-numbers': 'الأرقام التسلسلية',
    'loyalty': 'برنامج الولاء',
    'daily-site-reports': 'التقارير اليومية للموقع',
    'progress-bills': 'فواتير الإنجاز',
};

// ربط مسار الصلاحية بالموديولات المقابلة له في السجل
const PERMISSION_TO_MODULES: Record<string, string[]> = {
    '/sales':               ['sales'],
    '/purchases':           ['purchases'],
    '/purchase-orders':     ['purchase-orders'],
    '/sales-orders':        ['sales-orders'],
    '/sale-returns':        ['sale-returns'],
    '/purchase-returns':    ['purchase-returns'],
    '/customers':           ['customers'],
    '/suppliers':           ['suppliers'],
    '/items':               ['items'],
    '/warehouses':          ['warehouses'],
    '/warehouse-transfers': ['warehouse-transfers'],
    '/accounts':            ['accounts'],
    '/journal-entries':     ['journal-entries'],
    '/receipts':            ['vouchers'],
    '/payments':            ['vouchers'],
    '/purchase-payments':   ['vouchers'],
    '/employees':           ['employees'],
    '/attendance':          ['attendance', 'leaves'],
    '/payrolls':            ['payrolls'],
    '/expenses':            ['expenses'],
    '/advances':            ['advances'],
    '/deductions':          ['deductions'],
    '/sales-reps':          ['sales_reps', 'collections', 'commissions', 'sales-targets'],
    '/stocktakings':        ['stocktakings'],
    '/serial-numbers':      ['serial-numbers'],
    '/loyalty':             ['loyalty'],
    '/service-contracts':   ['service-contracts'],
    '/work-orders':         ['work-orders'],
    '/projects':            ['projects'],
    '/material-requests':   ['material-requests'],
    '/daily-site-reports':  ['daily-site-reports'],
    '/progress-bills':      ['progress-bills'],
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

/* ─── Field / Value translation maps ─── */

const FIELD_LABELS: Record<string, string> = {
    amount: 'المبلغ', method: 'طريقة الدفع', status: 'الحالة',
    name: 'الاسم', phone: 'الهاتف', email: 'البريد الإلكتروني',
    code: 'الكود', commissionRate: 'نسبة العمولة', commissionType: 'أساس العمولة',
    isActive: 'الحالة', date: 'التاريخ', checkNumber: 'رقم الشيك',
    checkDueDate: 'تاريخ الاستحقاق', notes: 'ملاحظات',
    total: 'الإجمالي', invoiceNumber: 'رقم الفاتورة', remaining: 'المتبقي',
    discount: 'الخصم', tax: 'الضريبة', subtotal: 'المجموع الفرعي',
    customerName: 'العميل', supplierName: 'المورد', employeeName: 'الموظف',
    quantity: 'الكمية', price: 'السعر', unit: 'الوحدة',
    type: 'النوع', category: 'الفئة', description: 'الوصف',
    balance: 'الرصيد', rate: 'المعدل', percentage: 'النسبة',
    العميل: 'العميل', المندوب: 'المندوب', المبلغ: 'المبلغ', 'طريقة الدفع': 'طريقة الدفع',
};

const VALUE_LABELS: Record<string, string> = {
    cash: 'نقدي', check: 'شيك', transfer: 'تحويل بنكي',
    pending: 'معلق', deposited: 'مُعتمَد', returned: 'مرتجع',
    invoice_total: 'على الفاتورة', collected_amount: 'على التحصيل',
    'true': 'نعم', 'false': 'لا',
    draft: 'مسودة', approved: 'مُعتمَد', rejected: 'مرفوض',
    active: 'نشط', inactive: 'موقوف',
};

function isUUID(val: string) {
    return typeof val === 'string' && val.length > 20 && /^[a-z0-9]+$/.test(val);
}

function renderDataFields(data: any, accentColor: string) {
    if (!data || typeof data !== 'object') return null;
    const entries = Object.entries(data).filter(([k, v]) => {
        if (v === null || v === undefined || v === '') return false;
        if ((k.endsWith('Id') || k === 'id') && isUUID(String(v))) return false;
        return true;
    });
    if (entries.length === 0) return null;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {entries.map(([key, value]) => (
                <div key={key} style={{ display: 'flex', gap: '8px', alignItems: 'baseline', fontSize: '12px' }}>
                    <span style={{ color: C.textMuted, minWidth: '110px', fontFamily: CAIRO, flexShrink: 0 }}>
                        {FIELD_LABELS[key] || key}
                    </span>
                    <span style={{ color: C.textPrimary, fontWeight: 600, fontFamily: CAIRO }}>
                        {toWesternNumerals(VALUE_LABELS[String(value)] ?? (typeof value === 'number' ? value.toLocaleString('en-US') : String(value)))}
                    </span>
                </div>
            ))}
        </div>
    );
}

/* ─── Helpers ─── */

function formatDate(isoStr: string): string {
    const d = new Date(isoStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function formatTime(isoStr: string): string {
    const d = new Date(isoStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function truncate(str: string, len: number): string {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '…' : str;
}

function toWesternNumerals(str: string): string {
    if (!str) return str;
    return str.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660));
}

/* ─── Expandable Row Detail ─── */

function MetaChip({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '12px', color: C.textMuted, fontFamily: CAIRO }}>{label}:</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: C.textPrimary, fontFamily: mono ? OUTFIT : CAIRO }}>{value}</span>
        </span>
    );
}

function ExpandedDetail({ log }: { log: ActivityLogEntry }) {
    return (
        <tr>
            <td colSpan={6} style={{ padding: '0', borderBottom: `1px solid ${C.border}` }}>
                <div style={{
                    borderTop: `1px solid ${C.border}`,
                    padding: '12px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontFamily: CAIRO,
                    fontSize: '13px',
                    color: C.textPrimary,
                }}>
                    {/* Full description */}
                    <div style={{ fontWeight: 500 }}>
                        {toWesternNumerals(log.description)}
                    </div>

                    {/* Meta info */}
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: C.textSecondary }}>
                        <MetaChip label="الصفحة" value={MODULE_LABELS[log.module] || log.module.replace(/-|_/g, ' ')} />
                        {log.entityRef && <MetaChip label="المرجع" value={toWesternNumerals(log.entityRef)} />}
                        {log.ipAddress && <MetaChip label="IP" value={log.ipAddress} mono />}
                    </div>

                    {/* Old / New data diff */}
                    {(log.oldData || log.newData) && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: log.oldData && log.newData ? '1fr 1fr' : '1fr',
                            gap: '12px',
                            marginTop: '4px',
                        }}>
                            {log.oldData && (
                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', marginBottom: '6px' }}>
                                        قبل التغيير
                                    </div>
                                    {renderDataFields(log.oldData, '#ef4444')}
                                </div>
                            )}
                            {log.newData && (
                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#22c55e', marginBottom: '6px' }}>
                                        بعد التغيير
                                    </div>
                                    {renderDataFields(log.newData, '#22c55e')}
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

    /* Select options — مبنية على الصلاحيات فقط */
    const perms: Record<string, any> = user.permissions || {};

    // موديولات ظاهرة دايماً (بدون صلاحية محددة)
    const alwaysVisible = ['auth', 'settings'];

    // استخراج الموديولات من مسارات الصلاحيات المتاحة للمستخدم
    const fromPerms = Object.keys(perms)
        .filter(path => !!perms[path])
        .flatMap(path => PERMISSION_TO_MODULES[path] || []);

    const rawModules = [...new Set([...alwaysVisible, ...fromPerms])];

    // إزالة المكررات بنفس الـ label
    const seenLabels = new Set<string>();
    const uniqueModules = rawModules.filter(mod => {
        const label = MODULE_LABELS[mod];
        if (!label || seenLabels.has(label)) return false;
        seenLabels.add(label);
        return true;
    });

    const moduleOptions = [
        { value: '', label: 'كل الموديولات' },
        ...uniqueModules.map(k => ({ value: k, label: MODULE_LABELS[k] })),
    ];

    const actionOptions = [
        { value: '', label: 'كل العمليات' },
        ...Object.entries(ACTION_LABELS).map(([k, v]) => ({ value: k, label: v.label })),
    ];

    /* Table columns */
    const columns: TableColumn[] = [
        {
            header: 'التاريخ والوقت',
            style: { textAlign: 'center' } as React.CSSProperties,
            cell: (row: ActivityLogEntry) => (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <span style={{ fontFamily: OUTFIT, fontSize: '12px', fontWeight: 600, color: C.textPrimary, whiteSpace: 'nowrap' }}>
                        {toWesternNumerals(formatDate(row.createdAt))}
                    </span>
                    <span style={{ fontFamily: OUTFIT, fontSize: '11px', color: C.textMuted, whiteSpace: 'nowrap' }}>
                        {toWesternNumerals(formatTime(row.createdAt))}
                    </span>
                </div>
            ),
        },
        {
            header: 'المستخدم',
            style: { textAlign: 'center' } as React.CSSProperties,
            cell: (row: ActivityLogEntry) => (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{
                        width: '30px', height: '30px', borderRadius: '50%',
                        background: `${C.primary}20`, border: `1px solid ${C.primary}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: C.primary, flexShrink: 0,
                    }}>
                        <User size={14} />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: C.textPrimary, whiteSpace: 'nowrap' }}>
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
            header: 'الصفحة',
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
            style: { textAlign: 'center' } as React.CSSProperties,
            cell: (row: ActivityLogEntry) => (
                <span
                    title={row.description}
                    style={{ fontSize: '12px', color: C.textSecondary, cursor: 'default', display: 'block', textAlign: 'center' }}
                >
                    {toWesternNumerals(truncate(row.description, 60))}
                </span>
            ),
        },
        {
            header: 'عرض',
            style: { textAlign: 'center', width: '60px' } as React.CSSProperties,
            cell: (row: ActivityLogEntry) => {
                const isExpanded = expandedRows.has(row.id);
                return (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleRow(row.id); }}
                            style={{
                                width: '32px', height: '32px', borderRadius: '8px',
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
                    </div>
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
