import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from './apiAuth';
import { rateLimit, getRateLimitKey } from './rateLimit';
import { sanitizeObject } from './sanitize';

type Handler = (req: NextRequest, session?: any, body?: any, context?: any) => Promise<NextResponse>;

export function withProtection(handler: Handler, options: {
    requireAdmin?: boolean,
    requireSuperAdmin?: boolean,
    limit?: number,
    windowMs?: number,
    sanitize?: boolean,
    isPublic?: boolean,
    cache?: number, // ثواني للـ browser cache على GET requests
} = {}) {
    return async (request: NextRequest, context: any) => {
        // 1. Rate Limiting
        const limitKey = getRateLimitKey(request);
        const { allowed, retryAfter } = rateLimit(limitKey, { 
            max: options.limit || 200, 
            windowMs: options.windowMs || 60 * 1000 
        });

        if (!allowed) {
            return NextResponse.json(
                { error: `نطالب بالهدوء قليلاً. يرجى المحاولة بعد ${retryAfter} ثانية` }, 
                { status: 429, headers: { 'Retry-After': retryAfter.toString() } }
            );
        }

        let session = undefined;

        if (!options.isPublic) {
            // 2. Authentication
            const { session: s, error: authError } = await requireAuth(request);
            if (authError) return authError;
            session = s;

            const user = session!.user as any;

            // 3. Super Admin Check (if required)
            if (options.requireSuperAdmin && !user?.isSuperAdmin) {
                return NextResponse.json({ error: 'هذا الإجراء يتطلب صلاحيات المسؤول العام' }, { status: 403 });
            }

            // 4. Admin Check (if required)
            if (options.requireAdmin) {
                const role = user?.role;
                if (role !== 'admin' && !user?.isSuperAdmin) {
                    return NextResponse.json({ error: 'هذا الإجراء يتطلب صلاحيات المدير' }, { status: 403 });
                }
            }
        }

        // 5. Body Sanitization (for POST/PUT/PATCH/DELETE)
        let sanitizedBody = undefined;
        const contentType = request.headers.get('content-type');
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) && 
            options.sanitize !== false && 
            contentType?.startsWith('application/json')
        ) {
            try {
                // Peek at the body only if needed
                const body = await request.clone().json();
                sanitizedBody = sanitizeObject(body);
            } catch (e) {
                // Invalid JSON or empty, skip
            }
        }

        // 6. Run actual handler
        try {
            const response = await handler(request, session, sanitizedBody, context);
            // إضافة cache header للـ GET requests لو محدد
            if (options.cache && request.method === 'GET' && response.status === 200) {
                response.headers.set('Cache-Control', `private, max-age=${options.cache}, stale-while-revalidate=${options.cache * 2}`);
            }
            return response;
        } catch (error: any) {
            console.error('API Error:', error);
            const message = process.env.NODE_ENV === 'development' ? error.message : 'حدث خطأ داخلي في الخادم';
            return NextResponse.json({ error: message }, { status: 500 });
        }
    };
}
