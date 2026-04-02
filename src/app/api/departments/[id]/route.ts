import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const PATCH = withProtection(async (request, session, body, context) => {
    try {
        const { id } = await context.params;
        const companyId = (session.user as any).companyId;
        const { name } = body;

        if (!name) {
            return NextResponse.json({ error: "اسم القسم مطلوب" }, { status: 400 });
        }

        const department = await prisma.department.update({
            where: { id: id, companyId },
            data: { name }
        });

        return NextResponse.json(department);
    } catch {
        return NextResponse.json({ error: "فشل في تحديث القسم" }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session, body, context) => {
    try {
        const { id } = await context.params;
        const companyId = (session.user as any).companyId;

        // Check if there are employees in this department
        const count = await prisma.employee.count({
            where: { departmentId: id, companyId }
        });

        if (count > 0) {
            return NextResponse.json({ error: "لا يمكن حذف القسم لوجود موظفين مرتبطين به" }, { status: 400 });
        }

        await prisma.department.delete({
            where: { id: id, companyId }
        });

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "فشل في حذف القسم" }, { status: 500 });
    }
});
