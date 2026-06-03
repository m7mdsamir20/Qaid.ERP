import React from 'react';
import { LucideIcon } from 'lucide-react';
import { TABLE_STYLE } from '@/constants/theme';
import { EmptyTableState, TableColumn } from './EmptyTableState';

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
                        <tr style={TABLE_STYLE.thead}>
                            {columns.map((col, idx) => {
                                const isCenter = col.type && col.type !== 'text';
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
                    </thead>
                    <tbody>
                        {data.map((row, rowIdx) => {
                            const isLast = rowIdx === data.length - 1;
                            const customRowStyle = rowStyle ? rowStyle(row, rowIdx) : {};
                            const customRowClass = rowClassName ? rowClassName(row, rowIdx) : '';
                            
                            return (
                                <tr
                                    key={rowIdx}
                                    style={{
                                        ...TABLE_STYLE.row(isLast),
                                        ...customRowStyle,
                                        cursor: onRowClick ? 'pointer' : 'default',
                                    }}
                                    className={customRowClass}
                                    onClick={() => onRowClick && onRowClick(row, rowIdx)}
                                >
                                    {columns.map((col, colIdx) => {
                                        const isCenter = col.type && col.type !== 'text';
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
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DataTable;
