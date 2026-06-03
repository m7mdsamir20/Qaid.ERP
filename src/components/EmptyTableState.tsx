import React from 'react';
import { LucideIcon } from 'lucide-react';
import { TABLE_STYLE } from '@/constants/theme';

export interface TableColumn {
    header: string;
    type?: 'text' | 'number' | 'date' | 'status' | 'action';
    accessorKey?: string;
    cell?: (row: any, index: number) => React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
}

interface EmptyTableStateProps {
    icon: LucideIcon;
    message: string;
    columns: TableColumn[];
}

export const EmptyTableState: React.FC<EmptyTableStateProps> = ({ icon: Icon, message, columns }) => {
    return (
        <div style={TABLE_STYLE.container}>
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
                    <tr>
                        <td colSpan={columns.length} style={{ padding: '60px 20px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                                <Icon size={36} style={{ color: 'var(--c-text-muted)', opacity: 0.5, display: 'block', margin: '0 auto' }} />
                                <span style={{ color: 'var(--c-text-secondary)', fontSize: '14px', fontWeight: 500 }}>
                                    {message}
                                </span>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

export default EmptyTableState;
