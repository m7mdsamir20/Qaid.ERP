import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function requireAuth(request?: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return {
            error: NextResponse.json({ error: 'غير مصرح — يرجى تسجيل الدخول' }, { status: 401 }),
            session: null
        };
    }

    const sub = (session.user as any)?.subscription;
    const isSuperAdmin = !!(session.user as any)?.isSuperAdmin || (session.user as any)?.role === 'superadmin';

    // التحقق من انتهاء الاشتراك / الفترة التجريبية
    if (sub && !isSuperAdmin) {
        const isExpired = new Date(sub.endDate).getTime() < Date.now();
        if ((isExpired || !sub.isActive) && request?.method !== 'GET') {
            return {
                error: NextResponse.json({
                    error: 'لقد انتهت صلاحية الاشتراك أو الفترة التجريبية. يرجى تجديد الاشتراك للاستمرار.',
                    code: 'SUBSCRIPTION_EXPIRED'
                }, { status: 402 }),
                session: null
            };
        }
    }

    return { error: null, session };
}

/**
 * بناء فلتر الفرع للـ Prisma queries
 * يأخذ الـ session ويرجع الـ where clause المناسب
 * - لو activeBranchId محدد → يفلتر بفرع واحد
 * - لو allowedBranches محدد (مش null) → يفلتر بالفروع المسموحة
 * - غير كده → كل الفروع (مدير)
 */
export function getBranchFilter(session: any): Record<string, any> {
    const activeBranchId = session?.user?.activeBranchId;
    const allowedBranches: string[] | null = session?.user?.allowedBranches ?? null;

    if (activeBranchId && activeBranchId !== 'all') {
        return { branchId: activeBranchId };
    }
    if (allowedBranches && allowedBranches.length > 0) {
        return { branchId: { in: allowedBranches } };
    }
    return {};
}

export async function requireAdmin() {
    const { session, error } = await requireAuth();
    if (error) return { error, session: null };

    const role = (session!.user as any)?.role;
    if (role !== 'admin' && !(session!.user as any)?.isSuperAdmin) {
        return {
            error: NextResponse.json({ error: 'هذا الإجراء يتطلب صلاحيات المدير' }, { status: 403 }),
            session: null
        };
    }

    return { error: null, session };
}
