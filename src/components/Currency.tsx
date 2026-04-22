import React from 'react';
import { getCurrencySymbol } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';
import { useSession } from 'next-auth/react';
import { C } from '@/constants/theme';

interface CurrencyProps {
    amount: number;
    code?: string; 
    lang?: 'ar' | 'en';
    className?: string;
    showSymbol?: boolean;
    style?: React.CSSProperties;
}

export function Currency({ amount, code: propCode, lang: propLang, className = '', showSymbol = true, style = {} }: CurrencyProps) {
    const { lang: contextLang } = useTranslation();
    const { data: session } = useSession();
    
    const lang = propLang || contextLang;
    const code = propCode || (session?.user as any)?.currency || 'EGP';

    const isRtl = lang === 'ar';
    const symbolText = getCurrencySymbol(code, lang);
    const absAmount = Math.abs(amount);
    
    const fmt = (v: number) => {
        return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    };

    const amountEl = (
        <span style={{ 
            fontWeight: 700, 
            fontFamily: "'ERP-Numbers', 'Outfit', sans-serif", 
            fontSize: '14px',
            color: 'inherit',
            letterSpacing: '0.2px' 
        }}>
            {amount < 0 ? '-' : ''}{fmt(absAmount)}
        </span>
    );

    const symbolEl = showSymbol ? (
        <span style={{ 
            fontFamily: "'Cairo', sans-serif", 
            fontSize: '11px', 
            fontWeight: 600,
            color: C.textSecondary,
            marginInlineStart: isRtl ? '3px' : '0',
            marginInlineEnd: isRtl ? '0' : '3px',
            verticalAlign: 'baseline',
            display: 'inline-block',
            opacity: 1
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
                direction: isRtl ? 'rtl' : 'ltr',
                ...style 
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
