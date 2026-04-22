'use client';

import React, { useState, useEffect } from 'react';
import { formatNumber, parseNumber } from '@/lib/currency';
import { IS, focusIn, focusOut, OUTFIT } from '@/constants/theme';

interface PriceInputProps {
    value: number | string;
    onChange: (val: number) => void;
    placeholder?: string;
    disabled?: boolean;
    style?: React.CSSProperties;
    className?: string;
    decimals?: number;
    textAlign?: 'left' | 'center' | 'right';
}

export default function PriceInput({ 
    value, 
    onChange, 
    placeholder = '0.00', 
    disabled = false, 
    style = {}, 
    className = '', 
    decimals = 2,
    textAlign = 'center'
}: PriceInputProps) {
    const [displayValue, setDisplayValue] = useState('');

    useEffect(() => {
        if (value === 0 || value === '0') {
             setDisplayValue('0.00');
             return;
        }
        if (!value) {
            setDisplayValue('');
            return;
        }
        setDisplayValue(formatNumber(value, decimals));
    }, [value, decimals]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        
        // Allow typing digits, commas, dots, and minus
        const cleanValue = rawValue.replace(/[^0-9.,-]/g, '');
        setDisplayValue(cleanValue);

        // Notify parent with the numeric value
        const numericValue = parseNumber(cleanValue);
        onChange(numericValue);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        focusOut(e);
        // Format on blur to ensure thousand separators and fixed decimals
        if (displayValue === '' || isNaN(parseNumber(displayValue))) {
            setDisplayValue('');
            onChange(0);
        } else {
            const formatted = formatNumber(parseNumber(displayValue), decimals);
            setDisplayValue(formatted);
        }
    };

    return (
        <input
            type="text"
            value={displayValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onFocus={focusIn}
            placeholder={placeholder}
            disabled={disabled}
            className={className}
            style={{ 
                ...IS, 
                height: '38px', 
                fontSize: '15px', 
                fontWeight: 900, 
                fontFamily: OUTFIT,
                textAlign: textAlign,
                ...style 
            }}
        />
    );
}
