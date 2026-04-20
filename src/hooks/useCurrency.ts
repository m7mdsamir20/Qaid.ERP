import React from 'react';
import { useSession } from 'next-auth/react';
import { getCurrencySymbol, formatMoney } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';
import { Currency } from '@/components/Currency';

export function useCurrency() {
    const { data: session } = useSession();
    const { lang } = useTranslation();
    const currency = (session?.user as any)?.currency || 'EGP';
    
    return {
        currency,
        symbol: getCurrencySymbol(currency, lang),
        fMoney: (amount: number) => formatMoney(amount, currency, lang),
        fMoneyJSX: (amount: number, className?: string): any => 
            React.createElement(Currency, { amount, code: currency, lang, className })
    };
}
