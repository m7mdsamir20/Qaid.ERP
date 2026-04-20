'use client';
import React from 'react';
import { getCurrencySymbol } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';
interface CurrencyProps {
    amount: number;
    code: string;
    lang: 'ar' | 'en';
    className?: string;
    showSymbol?: boolean;
}

export function Currency({ amount, code, lang, className = '', showSymbol = true }: CurrencyProps) {
    const activeLang = lang;
    const activeCode = code;
    
    const symbol = getCurrencySymbol(activeCode, activeLang);
    const absAmount = Math.abs(amount);
    
    const formattedNum = absAmount.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });

    const amountEl = <span className="amount">{formattedNum}</span>;
    const symbolEl = showSymbol ? <span className="currency">{symbol}</span> : null;

    return (
        <span className={`currency-display ${className}`} style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px', direction: activeLang === 'ar' ? 'rtl' : 'ltr' }}>
            {amount < 0 && <span>-</span>}
            {activeLang === 'ar' ? (
                <>
                    {amountEl}
                    {symbolEl}
                </>
            ) : (
                <>
                    {symbolEl}
                    {amountEl}
                </>
            )}
        </span>
    );
}

export default Currency;
