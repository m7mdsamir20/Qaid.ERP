import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection, safeErrorMsg } from '@/lib/apiHandler';

export const PUT = withProtection(async (request, session, body, { params }) => {
    try {
        const { id } = await params;
        const companyId = (session as any).companyId;

        // Validate record belongs to company
        const existing = await prisma.subContract.findUnique({
            where: { id, companyId },
        });

        if (!existing) {
            return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
        }

        const updated = await prisma.subContract.update({
            where: { id, companyId },
            data: {
                ...(body.projectId !== undefined && { projectId: body.projectId }),
                ...(body.subcontractorId !== undefined && { subcontractorId: body.subcontractorId }),
                ...(body.description !== undefined && { description: body.description }),
                ...(body.contractValue !== undefined && { contractValue: Number(body.contractValue) || 0 }),
                ...(body.startDate !== undefined && { startDate: body.startDate ? new Date(body.startDate) : null }),
                ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
                ...(body.status !== undefined && { status: body.status }),
                ...(body.notes !== undefined && { notes: body.notes }),
            },
            include: {
                project: { select: { name: true } },
                subcontractor: { select: { name: true } },
            },
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('PUT /api/sub-contracts/[id] Error:', error);
        return NextResponse.json({ error: safeErrorMsg(error, 'فشل في تعديل العقد الفرعي') }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session, body, { params }) => {
    try {
        const { id } = await params;
        const companyId = (session as any).companyId;

        // Validate record belongs to company
        const existing = await prisma.subContract.findUnique({
            where: { id, companyId },
        });

        if (!existing) {
            return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
        }

        // Refuse deletion if payments have been made against this contract
        if (existing.paidAmount > 0) {
            return NextResponse.json(
                { error: 'لا يمكن حذف عقد فرعي تم تسجيل مدفوعات له' },
                { status: 400 }
            );
        }

        await prisma.subContract.delete({ where: { id, companyId } });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('DELETE /api/sub-contracts/[id] Error:', error);
        return NextResponse.json({ error: safeErrorMsg(error, 'فشل في حذف العقد الفرعي') }, { status: 500 });
    }
});
