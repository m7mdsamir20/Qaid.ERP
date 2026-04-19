import { useSession } from 'next-auth/react';
import { getCurrencySymbol, formatMoney } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';

export function useCurrency() {
    const { data: session } = useSession();
    const { lang } = useTranslation();
    const currency = (session?.user as any)?.currency || 'EGP';
    
    return {
        currency,
        symbol: getCurrencySymbol(currency, lang),
        fMoney: (amount: number) => formatMoney(amount, currency, lang)
    };
}
