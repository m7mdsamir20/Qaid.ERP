import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { generateNextCode } from '@/lib/autoId';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const categories = await prisma.category.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { items: true } },
            },
        });
        return NextResponse.json(categories);
    } catch (error: any) {
        console.error("GET /api/categories Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}, { cache: 30 });

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;

        let codeToUse = body.code;
        if (!codeToUse) {
            const lastCategory = await prisma.category.findFirst({
                where: { companyId, code: { startsWith: 'CAT-' } },
                orderBy: { code: 'desc' }
            });
            codeToUse = generateNextCode(lastCategory?.code, 'CAT-', 3);
        }

        const category = await prisma.category.create({
            data: {
                name: body.name,
                code: codeToUse,
                companyId: companyId,
            },
        });
        return NextResponse.json(category, { status: 201 });
    } catch (error: any) {
        console.error("POST /api/categories Error:", error);
        return NextResponse.json({ error: 'فشل في إنشاء المجموعة', details: error.message }, { status: 500 });
    }
});

export const PUT = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        if (!body.id || !body.name) return NextResponse.json({ error: 'Missing id or name' }, { status: 400 });

        const category = await prisma.category.updateMany({
            where: { id: body.id, companyId },
            data: { 
                name: body.name,
                code: body.code
            },
        });

        if (category.count === 0) return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: 'فشل في التحديث', details: error.message }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        // Check for related items
        const rel = await prisma.item.count({ where: { categoryId: id, companyId } });
        if (rel > 0) return NextResponse.json({ error: 'لا يمكن حذف التصنيف لوجود أصناف مرتبطة به' }, { status: 400 });

        await prisma.category.deleteMany({
            where: { id, companyId },
        });
        
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: 'الفشل في الحذف', details: error.message }, { status: 500 });
    }
});
