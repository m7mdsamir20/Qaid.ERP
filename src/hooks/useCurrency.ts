import { useSession } from 'next-auth/react';
import { getCurrencySymbol } from '@/lib/currency';

export function useCurrency() {
    const { data: session } = useSession();
    const currency = (session?.user as any)?.currency || 'EGP';
    return {
        currency,
        symbol: getCurrencySymbol(currency)
    };
}
