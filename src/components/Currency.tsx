import React from 'react';
import { CAIRO, INTER } from '@/constants/theme';

interface CurrencyProps {
    amount: number;
    code: string; // e.g. EGP, SAR
    lang: 'ar' | 'en';
    className?: string;
    showSymbol?: boolean;
}

export function Currency({ amount, code, lang, className = '', showSymbol = true }: CurrencyProps) {
    const isRtl = lang === 'ar';
    const fmt = (v: number) => {
        return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    };

    // Get the symbol text directly
    // Ideally we'd use a shared utility here, but to avoid circular deps we define common ones
    const getSymbol = (c: string, l: string) => {
        if (l === 'ar') {
            if (c === 'EGP') return 'ج.م';
            if (c === 'SAR') return 'ر.س';
            if (c === 'AED') return 'د.إ';
            if (c === 'USD') return '$';
            return c;
        }
        return c;
    }

    const symbolText = getSymbol(code, lang);

    const amountEl = (
        <span style={{ 
            fontWeight: 700, 
            fontFamily: 'inherit', // Keeping existing font for numbers
            letterSpacing: '0.2px' 
        }}>
            {fmt(amount)}
        </span>
    );

    const symbolEl = showSymbol ? (
        <span style={{ 
            fontFamily: "'Cairo', sans-serif", // Pure Cairo for symbols only
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
                    {amountEl} {symbolEl}
                </>
            )}
        </span>
    );
}

export default Currency;
