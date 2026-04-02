interface RateLimitRecord {
    count: number;
    resetAt: number;
    blockedUntil?: number;
}

const store = new Map<string, RateLimitRecord>();

// تنظيف تلقائي كل 10 دقائق
setInterval(() => {
    const now = Date.now();
    store.forEach((record, key) => {
        if (now > record.resetAt && (!record.blockedUntil || now > record.blockedUntil)) {
            store.delete(key);
        }
    });
}, 10 * 60 * 1000);

export function rateLimit(
    key: string,
    options: {
        max?: number;
        windowMs?: number;
        blockMs?: number;
    } = {}
) {
    const { max = 10, windowMs = 60 * 1000, blockMs = 15 * 60 * 1000 } = options;
    const now = Date.now();
    const record = store.get(key);

    // لو محجوب
    if (record?.blockedUntil && now < record.blockedUntil) {
        const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
        return { allowed: false, retryAfter, blocked: true };
    }

    // أول طلب أو انتهت الفترة
    if (!record || now > record.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, retryAfter: 0, blocked: false };
    }

    // تجاوز الحد — حجب
    if (record.count >= max) {
        record.blockedUntil = now + blockMs;
        const retryAfter = Math.ceil(blockMs / 1000);
        return { allowed: false, retryAfter, blocked: true };
    }

    record.count++;
    return { allowed: true, retryAfter: 0, blocked: false };
}

// للاستخدام السريع في الـ API
export function getRateLimitKey(request: Request, suffix = '') {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0] || 'unknown';
    return `${ip}${suffix ? ':' + suffix : ''}`;
}
