import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const recipes = await prisma.recipe.findMany({
            where: { companyId },
            include: {
                item: { select: { id: true, name: true, salePrice: true } },
                items: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(recipes);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const recipe = await prisma.recipe.create({
            data: {
                itemId: body.itemId,
                notes: body.notes,
                companyId,
                items: {
                    create: (body.items ?? []).map((i: any) => ({
                        itemId: i.itemId,
                        quantity: i.quantity,
                        unit: i.unit,
                    })),
                },
            },
            include: { item: true, items: true },
        });
        return NextResponse.json(recipe, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const PUT = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        await prisma.recipe.updateMany({
            where: { id: body.id, companyId },
            data: { notes: body.notes },
        });

        // Sync items
        await prisma.recipeItem.deleteMany({ where: { recipeId: body.id } });
        if (body.items?.length > 0) {
            await prisma.recipeItem.createMany({
                data: (body.items as any[]).map((i: any) => ({
                    recipeId: body.id,
                    itemId: i.itemId,
                    quantity: i.quantity,
                    unit: i.unit ?? '',
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
        await prisma.recipe.deleteMany({ where: { id, companyId } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
