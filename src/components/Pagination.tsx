'use client';
import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { C, CAIRO, INTER } from '@/constants/theme';

interface PaginationProps {
    total: number;
    pageSize: number;
    currentPage: number;
    onPageChange: (page: number) => void;
}

export default function Pagination({ total, pageSize, currentPage, onPageChange }: PaginationProps) {
    const totalPages = Math.ceil(total / pageSize);
    if (totalPages <= 1) return null;

    const startIdx = (currentPage - 1) * pageSize + 1;
    const endIdx = Math.min(currentPage * pageSize, total);

    return (
        <div style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
            padding: '16px 20px', borderTop: `1px solid ${C.border}`,
            background: 'rgba(255,255,255,0.01)', borderBottomLeftRadius: '14px', borderBottomRightRadius: '14px'
        }}>
            {/* Info */}
            <div style={{ fontSize: '13px', color: C.textSecondary, fontFamily: CAIRO }}>
                عرض <span style={{ fontFamily: INTER, fontWeight: 900, color: C.primary }}>{startIdx}</span> - <span style={{ fontFamily: INTER, fontWeight: 900, color: C.primary }}>{endIdx}</span> من أصل <span style={{ fontFamily: INTER, fontWeight: 900, color: C.textPrimary }}>{total}</span>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    style={{ 
                        width: '36px', height: '36px', borderRadius: '10px', 
                        border: `1px solid ${C.border}`, background: C.card,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: currentPage === 1 ? C.textMuted : C.textPrimary,
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        transition: '0.2s', opacity: currentPage === 1 ? 0.5 : 1
                    }}
                    onMouseEnter={e => { if (currentPage !== 1) e.currentTarget.style.borderColor = C.primary; }}
                    onMouseLeave={e => { if (currentPage !== 1) e.currentTarget.style.borderColor = C.border; }}
                >
                    <ChevronRight size={18} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', direction: 'inherit' }}>
                    <div style={{ 
                        height: '36px', padding: '0 16px', borderRadius: '10px', 
                        background: C.primaryBg, border: `1px solid ${C.primaryBorder}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', fontWeight: 900, color: C.primary, fontFamily: INTER
                    }}>
                        {currentPage}
                    </div>
                    <span style={{ fontSize: '12px', color: C.textMuted, fontFamily: CAIRO, margin: '0 4px', width: '24px', textAlign: 'center' }}>من</span>
                    <div style={{ 
                        height: '36px', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '0 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', fontWeight: 800, color: C.textSecondary, fontFamily: INTER,
                        background: 'rgba(255,255,255,0.02)'
                    }}>
                        {totalPages}
                    </div>
                </div>

                <button 
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                    style={{ 
                        width: '36px', height: '36px', borderRadius: '10px', 
                        border: `1px solid ${C.border}`, background: C.card,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: currentPage === totalPages ? C.textMuted : C.textPrimary,
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        transition: '0.2s', opacity: currentPage === totalPages ? 0.5 : 1
                    }}
                    onMouseEnter={e => { if (currentPage !== totalPages) e.currentTarget.style.borderColor = C.primary; }}
                    onMouseLeave={e => { if (currentPage !== totalPages) e.currentTarget.style.borderColor = C.border; }}
                >
                    <ChevronLeft size={18} />
                </button>
            </div>
        </div>
    );
}
