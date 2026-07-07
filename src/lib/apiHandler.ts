import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from './apiAuth';
import { rateLimit, getRateLimitKey } from './rateLimit';
import { sanitizeObject } from './sanitize';

/** Returns safe error message — hides internals in production */
export function safeErrorMsg(e: any, fallback: string): string {
    if (process.env.NODE_ENV === 'development') return e?.message || fallback;
    return fallback;
}

// ─── RBAC helpers ──────────────────────────────────────────────────────────────

/** API path segment → permission module key (for non-obvious mappings) */
const API_SEGMENT_TO_MODULE: Record<string, string> = {
    'vouchers': '/receipts',
    'debt-settlement': '/settlements',
    'profit-distributions': '/profit-distribution',
    'collections': '/sales-reps/collections',
    'commissions': '/sales-reps/commissions',
    'targets': '/sales-reps/targets',
    'drivers': '/restaurant/drivers',
};

function deriveModule(pathname: string): string | null {
    const match = pathname.match(/^\/api\/([^/]+)/);
    if (!match) return null;
    const seg = match[1];
    return API_SEGMENT_TO_MODULE[seg] ?? ('/' + seg);
}

function deriveAction(method: string, pathname: string): string {
    if (method === 'POST' && pathname.endsWith('/approve')) return 'approve';
    switch (method) {
        case 'GET':    return 'view';
        case 'POST':   return 'create';
        case 'PUT':
        case 'PATCH':
        case 'DELETE': return 'editDelete';
        default:       return 'view';
    }
}

// ──────────────────────────────────────────────────────────────────────────────

type Handler = (req: NextRequest, session?: any, body?: any, context?: any) => Promise<NextResponse>;

export function withProtection(handler: Handler, options: {
    requireAdmin?: boolean,
    requireSuperAdmin?: boolean,
    limit?: number,
    windowMs?: number,
    sanitize?: boolean,
    isPublic?: boolean,
    cache?: number,
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

            // 5. RBAC — custom-role permission check
            // Runs for non-admin users who have a custom permissions object.
            // Deny-by-default: if a module is in the permissions object, the action must be explicitly allowed.
            // If the module is absent from the object, access is also denied (least-privilege).
            if (!options.requireAdmin && !options.requireSuperAdmin) {
                const userPerms: Record<string, any> = user?.permissions || {};
                const isAdmin = user?.role === 'admin' || !!user?.isSuperAdmin;

                if (!isAdmin && Object.keys(userPerms).length > 0) {
                    const module = deriveModule(request.nextUrl.pathname);
                    if (module) {
                        const modulePerms = userPerms[module];
                        const action = deriveAction(request.method, request.nextUrl.pathname);
                        // Deny if module is absent from permissions OR action is not allowed
                        if (modulePerms === undefined || !modulePerms[action]) {
                            return NextResponse.json(
                                { error: 'ليس لديك صلاحية هذه العملية' },
                                { status: 403 }
                            );
                        }
                    }
                }
            }
        }

        // 6. Body Sanitization (for POST/PUT/PATCH/DELETE)
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

        // 7. Run actual handler
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
