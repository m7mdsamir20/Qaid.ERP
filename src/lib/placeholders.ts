export function getCountryPlaceholders(countryCode?: string) {
    const code = (countryCode || 'EG').toUpperCase();
    switch (code) {
        case 'SA': // Saudi Arabia
            return {
                phone: '0501234567',
                taxNumber: '300000000000003',
                cr: '1010123456',
                address: 'الرياض، حي العليا، شارع التحلية...'
            };
        case 'AE': // UAE
            return {
                phone: '0501234567',
                taxNumber: '100000000000003',
                cr: '123456',
                address: 'دبي، وسط المدينة، شارع الشيخ زايد...'
            };
        case 'KW': // Kuwait
            return {
                phone: '90000000',
                taxNumber: 'N/A',
                cr: '12345',
                address: 'الكويت، العاصمة، شارع فهد السالم...'
            };
        case 'QA': // Qatar
            return {
                phone: '33000000',
                taxNumber: '0000000000',
                cr: '12345',
                address: 'الدوحة، الخليج الغربي...'
            };
        case 'BH': // Bahrain
            return {
                phone: '36000000',
                taxNumber: '200000000000002',
                cr: '12345',
                address: 'المنامة، المنطقة الدبلوماسية...'
            };
        case 'OM': // Oman
            return {
                phone: '90000000',
                taxNumber: 'OM12345678',
                cr: '1234567',
                address: 'مسقط، روي...'
            };
        case 'JO': // Jordan
            return {
                phone: '0791234567',
                taxNumber: '123456789',
                cr: '12345',
                address: 'عمان، العبدلي...'
            };
        case 'EG': // Egypt
        default:
            return {
                phone: '01012345678',
                taxNumber: '123-456-789',
                cr: '123456',
                address: 'القاهرة، مدينة نصر، شارع مكرم عبيد...'
            };
    }
}
