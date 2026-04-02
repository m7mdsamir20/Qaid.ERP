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

export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
    const result = { ...obj } as any;
    for (const key of Object.keys(result)) {
        if (typeof result[key] === 'string') {
            result[key] = sanitizeString(result[key]);
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
