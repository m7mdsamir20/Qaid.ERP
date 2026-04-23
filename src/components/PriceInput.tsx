'use client';

import React, { useState, useEffect } from 'react';
import { formatNumber, parseNumber } from '@/lib/currency';
import { IS, focusIn, focusOut, OUTFIT } from '@/constants/theme';

interface PriceInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
    value: number | string;
    onChange: (val: number) => void;
    decimals?: number;
    textAlign?: 'left' | 'center' | 'right';
}

export default React.forwardRef<HTMLInputElement, PriceInputProps>(function PriceInput({ 
    value, 
    onChange, 
    placeholder = '0.00', 
    disabled = false, 
    style = {}, 
    className = '', 
    decimals = 2,
    textAlign = 'center',
    onFocus,
    onBlur,
    ...rest
}, ref) {
    const [displayValue, setDisplayValue] = useState('');

    useEffect(() => {
        if (value === 0 || value === '0') {
             setDisplayValue('');
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
        if (onBlur) onBlur(e);
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
            ref={ref}
            type="text"
            value={displayValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onFocus={(e) => {
                focusIn(e);
                if (onFocus) onFocus(e);
            }}
            placeholder={placeholder}
            disabled={disabled}
            className={className}
            {...rest}
            style={{ 
                ...IS, 
                height: '38px', 
                fontSize: '16px', 
                fontWeight: 600, 
                fontFamily: OUTFIT,
                textAlign: textAlign,
                ...style 
            }}
        />
    );
});
