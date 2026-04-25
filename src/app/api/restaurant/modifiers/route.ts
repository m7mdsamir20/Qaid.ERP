import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const modifiers = await prisma.modifier.findMany({
            where: { companyId },
            include: { options: true },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(modifiers);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const modifier = await prisma.modifier.create({
            data: {
                name: body.name,
                required: body.required ?? false,
                multiSelect: body.multiSelect ?? false,
                companyId,
                options: {
                    create: (body.options ?? []).map((o: any) => ({
                        name: o.name,
                        extraPrice: o.extraPrice ?? 0,
                    })),
                },
            },
            include: { options: true },
        });
        return NextResponse.json(modifier, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const PUT = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        // Update modifier
        await prisma.modifier.updateMany({
            where: { id: body.id, companyId },
            data: { name: body.name, required: body.required, multiSelect: body.multiSelect },
        });

        // Sync options: delete all then recreate
        await prisma.modifierOption.deleteMany({ where: { modifierId: body.id } });
        if (body.options?.length > 0) {
            await prisma.modifierOption.createMany({
                data: (body.options as any[]).map((o: any) => ({
                    modifierId: body.id,
                    name: o.name,
                    extraPrice: o.extraPrice ?? 0,
                })),
            });
        }
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const id = new URL(request.url).searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        await prisma.modifier.deleteMany({ where: { id, companyId } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
