import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

// POST /api/admin/fix-branches
// ينشئ فرع رئيسي لكل شركة مش عندها فروع
export const POST = withProtection(async (request, session) => {
    if (!(session.user as any)?.isSuperAdmin) {
        return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
    }

    try {
        const companies = await (prisma as any).company.findMany({
            include: { branches: true, subscription: true }
        });

        const results = [];
        for (const company of companies) {
            if (company.branches.length === 0) {
                const branch = await (prisma as any).branch.create({
                    data: {
                        name: 'الفرع الرئيسي',
                        code: 'MAIN',
                        isMain: true,
                        isActive: true,
                        companyId: company.id,
                    }
                });
                results.push({ companyId: company.id, companyName: company.name, branchId: branch.id, action: 'created' });
            } else {
                results.push({ companyId: company.id, companyName: company.name, action: 'skipped', branches: company.branches.length });
            }

            // تأكد إن الـ subscription عندها maxBranches
            if (company.subscription) {
                await (prisma as any).subscription.update({
                    where: { companyId: company.id },
                    data: { maxBranches: company.subscription.maxBranches ?? 1 }
                });
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}, { requireSuperAdmin: true });
