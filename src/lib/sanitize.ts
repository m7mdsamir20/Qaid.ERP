export function sanitizeString(input: string): string {
    if (typeof input !== 'string') return input;
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .trim();
}

// حقول تحتوي على JSON ولا يجب تشفيرها
const JSON_FIELDS = new Set(['address', 'addr', 'settings', 'metadata', 'data', 'config']);

export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
    const result = { ...obj } as any;
    for (const key of Object.keys(result)) {
        if (typeof result[key] === 'string') {
            // حقول JSON تُترك كما هي بدون تشفير
            result[key] = JSON_FIELDS.has(key) ? result[key].trim() : sanitizeString(result[key]);
        } else if (typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])) {
            result[key] = sanitizeObject(result[key]);
        }
    }
    return result as T;
}

// للأسماء والنصوص فقط — مش للإيميل أو الأرقام
export function sanitizeName(input: string): string {
    return sanitizeString(input).replace(/[<>{}[\]\\]/g, '');
}
