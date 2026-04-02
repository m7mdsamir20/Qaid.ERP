import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { getBranchFilter } from '@/lib/apiAuth';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const branchFilter = getBranchFilter(session);

        const departments = await prisma.department.findMany({
            where: { companyId, ...branchFilter },
            include: { _count: { select: { employees: true } } },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(departments);
    } catch {
        return NextResponse.json([], { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;

        if (!body.name) {
            return NextResponse.json({ error: "اسم القسم مطلوب" }, { status: 400 });
        }

        const activeBranchId = (session.user as any).activeBranchId;

        const department = await (prisma as any).department.create({
            data: {
                name: body.name,
                companyId,
                branchId: activeBranchId && activeBranchId !== 'all' ? activeBranchId : null,
            }
        });

        return NextResponse.json(department, { status: 201 });
    } catch {
        return NextResponse.json({ error: "فشل في إنشاء القسم" }, { status: 500 });
    }
});
