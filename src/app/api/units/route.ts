import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { generateNextCode } from '@/lib/autoId';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const units = await prisma.unit.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(units);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const { name, nameEn } = body;

        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

        const lastUnit = await prisma.unit.findFirst({
            where: { companyId, code: { startsWith: 'UNT-' } },
            orderBy: { code: 'desc' }
        });

        const nextCode = generateNextCode(lastUnit?.code, 'UNT-', 3);

        const unit = await prisma.unit.create({
            data: {
                name,
                nameEn: nameEn || null,
                code: nextCode,
                status: 'active',
                companyId
            }
        });

        return NextResponse.json(unit);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'وحدة بهذا الاسم موجودة بالفعل' }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const PUT = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const { id, name, nameEn, status } = body;

        const data: any = {};
        if (name !== undefined) data.name = name;
        if (nameEn !== undefined) data.nameEn = nameEn || null;
        if (status !== undefined) data.status = status;

        const unit = await prisma.unit.update({
            where: { id, companyId },
            data
        });

        return NextResponse.json(unit);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'وحدة بهذا الاسم موجودة بالفعل' }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        const itemsCount = await prisma.item.count({ where: { unitId: id, companyId } });
        if (itemsCount > 0) {
            return NextResponse.json({ error: 'لا يمكن حذف الوحدة لأنها مرتبطة بأصناف.' }, { status: 400 });
        }

        await prisma.unit.delete({
            where: { id, companyId }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
