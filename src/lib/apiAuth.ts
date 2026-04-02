import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function requireAuth() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return {
            error: NextResponse.json({ error: 'غير مصرح — يرجى تسجيل الدخول' }, { status: 401 }),
            session: null
        };
    }

    const companyId = (session.user as any)?.companyId;
    if (!companyId && (session.user as any)?.role !== 'superadmin') {
        return {
            error: NextResponse.json({ error: 'لا يوجد شركة مرتبطة بهذا الحساب' }, { status: 403 }),
            session: null
        };
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
