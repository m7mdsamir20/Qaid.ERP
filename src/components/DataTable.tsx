import React from 'react';
import { LucideIcon } from 'lucide-react';
import { TABLE_STYLE, C } from '@/constants/theme';
import { EmptyTableState, TableColumn } from './EmptyTableState';

export const isCenteredColumn = (col: TableColumn): boolean => {
    if (col.type && col.type !== 'text') return true;
    // Explicit style override
    if (col.style && (col.style as React.CSSProperties).textAlign === 'center') return true;
    if (!col.header) return false;
    const h = col.header.toLowerCase();
    return h.includes('رقم') ||
           h.includes('كود') ||
           h.includes('معرف') ||
           h.includes('الرمز') ||
           h.includes('الحالة') ||
           h.includes('الإجراءات') ||
           h.includes('إجراءات') ||
           h.includes('actions') ||
           h.includes('status') ||
           h.includes('المنصب') ||
           h.includes('الراتب') ||
           h.includes('التاريخ') ||
           h.includes('date') ||
           h.includes('salary') ||
           h.includes('no.') ||
           h.includes('number') ||
           h.includes('code') ||
           h.includes('id') ||
           h.includes('serial');
};

interface DataTableProps {
    columns: TableColumn[];
    data: any[];
    emptyIcon: LucideIcon;
    emptyMessage: string;
    isLoading?: boolean;
    loadingSkeleton?: React.ReactNode;
    onRowClick?: (row: any, index: number) => void;
    rowStyle?: (row: any, index: number) => React.CSSProperties;
    rowClassName?: (row: any, index: number) => string;
    footer?: React.ReactNode;
    expandableRow?: (row: any, index: number) => React.ReactNode;
    customHeader?: React.ReactNode;
}

export const DataTable: React.FC<DataTableProps> = ({
    columns,
    data,
    emptyIcon,
    emptyMessage,
    isLoading,
    loadingSkeleton,
    onRowClick,
    rowStyle,
    rowClassName,
    footer,
    expandableRow,
    customHeader,
}) => {
    if (isLoading && loadingSkeleton) {
        return <>{loadingSkeleton}</>;
    }

    if (!data || data.length === 0) {
        return (
            <EmptyTableState
                icon={emptyIcon}
                message={emptyMessage}
                columns={columns}
            />
        );
    }

    return (
        <div style={TABLE_STYLE.container}>
            <div className="scroll-table">
                <table style={TABLE_STYLE.table}>
                    <thead>
                        {customHeader ? (
                            customHeader
                        ) : (
                            <tr style={TABLE_STYLE.thead}>
                                {columns.map((col, idx) => {
                                    const isCenter = isCenteredColumn(col);
                                    const cellAlignClass = isCenter ? 'table-cell-center' : 'table-cell-text';
                                    return (
                                        <th
                                            key={idx}
                                            style={{
                                                ...TABLE_STYLE.th(idx === 0, isCenter),
                                                ...col.style,
                                            }}
                                            className={`${cellAlignClass} ${col.className || ''}`}
                                        >
                                            {col.header}
                                        </th>
                                    );
                                })}
                            </tr>
                        )}
                    </thead>
                    <tbody>
                        {data.map((row, rowIdx) => {
                            const isLast = rowIdx === data.length - 1;
                            const customRowStyle = rowStyle ? rowStyle(row, rowIdx) : {};
                            const customRowClass = rowClassName ? rowClassName(row, rowIdx) : '';
                            
                            const mainRow = (
                                <tr
                                    key={`main-${rowIdx}`}
                                    style={{
                                        ...TABLE_STYLE.row(isLast && !expandableRow),
                                        ...customRowStyle,
                                        cursor: onRowClick ? 'pointer' : 'default',
                                    }}
                                    className={customRowClass}
                                    onClick={() => onRowClick && onRowClick(row, rowIdx)}
                                >
                                    {columns.map((col, colIdx) => {
                                        const isCenter = isCenteredColumn(col);
                                        const cellAlignClass = isCenter ? 'table-cell-center' : 'table-cell-text';
                                        return (
                                            <td
                                                key={colIdx}
                                                style={{
                                                    ...TABLE_STYLE.td(colIdx === 0, isCenter),
                                                    ...col.style,
                                                }}
                                                className={`${cellAlignClass} ${col.className || ''}`}
                                            >
                                                {col.cell
                                                    ? col.cell(row, rowIdx)
                                                    : col.accessorKey
                                                    ? row[col.accessorKey]
                                                    : null}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );

                            if (expandableRow) {
                                return (
                                    <React.Fragment key={rowIdx}>
                                        {mainRow}
                                        {expandableRow(row, rowIdx)}
                                    </React.Fragment>
                                );
                            }

                            return mainRow;
                        })}
                    </tbody>
                    {footer && (
                        <tfoot style={{ borderTop: `2px solid ${C.border}` }}>
                            {footer}
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
};

export default DataTable;
