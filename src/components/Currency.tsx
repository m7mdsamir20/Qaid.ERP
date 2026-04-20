import React from 'react';
import { getCurrencySymbol } from '@/lib/currency';

interface CurrencyProps {
    amount: number;
    code: string; 
    lang: 'ar' | 'en';
    className?: string;
    showSymbol?: boolean;
}

export function Currency({ amount, code, lang, className = '', showSymbol = true }: CurrencyProps) {
    const isRtl = lang === 'ar';
    const symbolText = getCurrencySymbol(code, lang);
    const absAmount = Math.abs(amount);
    
    const fmt = (v: number) => {
        return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    };

    const amountEl = (
        <span style={{ 
            fontWeight: 700, 
            fontFamily: 'inherit', 
            letterSpacing: '0.2px' 
        }}>
            {amount < 0 ? '-' : ''}{fmt(absAmount)}
        </span>
    );

    const symbolEl = showSymbol ? (
        <span style={{ 
            fontFamily: "'Cairo', sans-serif", 
            fontSize: 'max(0.75em, 11px)', 
            fontWeight: 600,
            opacity: 0.9,
            marginInlineStart: isRtl ? '4px' : '0',
            marginInlineEnd: isRtl ? '0' : '4px'
        }}>
            {symbolText}
        </span>
    ) : null;

    return (
        <span 
            className={`currency-display ${className}`} 
            style={{ 
                display: 'inline-flex', 
                alignItems: 'baseline', 
                gap: '2px', 
                whiteSpace: 'nowrap',
                direction: isRtl ? 'rtl' : 'ltr'
            }}
        >
            {isRtl ? (
                <>
                    {amountEl} {symbolEl}
                </>
            ) : (
                <>
                    {symbolEl} {amountEl}
                </>
            )}
        </span>
    );
}

export default Currency;
