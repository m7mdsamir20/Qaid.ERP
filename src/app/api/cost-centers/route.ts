import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month');
        const year = searchParams.get('year');

        const costCenters = await prisma.costCenter.findMany({
            where: { companyId },
            include: {
                journalLines: {
                    include: {
                        journalEntry: true
                    },
                    where: (month && year) ? {
                        journalEntry: {
                            date: {
                                gte: new Date(Number(year), Number(month) - 1, 1),
                                lt: new Date(Number(year), Number(month), 1),
                            }
                        }
                    } : undefined
                }
            },
            orderBy: { code: 'asc' },
        });

        const enhancedCostCenters = costCenters.map(cc => ({
            id: cc.id,
            code: cc.code,
            name: cc.name,
            description: (cc as any).description || null,
            isActive: (cc as any).isActive ?? true,
            companyId: cc.companyId,
            createdAt: cc.createdAt,
            totalExpenses: cc.journalLines.reduce((acc, line) => acc + Number(line.debit || 0), 0),
            transactionCount: cc.journalLines.length,
        }));

        return NextResponse.json(enhancedCostCenters);
    } catch (error) {
        console.error('GET Cost Centers Error:', error);
        return NextResponse.json([], { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const { code, name, description, isActive } = body;

        if (!code || !name) {
            return NextResponse.json({ error: "الرمز والاسم مطلوبان" }, { status: 400 });
        }

        const data: any = {
            code,
            name,
            companyId,
        };

        // Resiliently add fields that might not exist in older DB schema
        if (description !== undefined) data.description = description || null;
        if (isActive !== undefined) data.isActive = isActive ?? true;

        const costCenter = await prisma.costCenter.create({
            data
        });

        return NextResponse.json(costCenter, { status: 201 });
    } catch (error: any) {
        console.error('POST Cost Center Error:', error);
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'رمز مركز التكلفة موجود بالفعل' }, { status: 400 });
        }
        return NextResponse.json({ error: error.message || 'فشل في إنشاء مركز التكلفة' }, { status: 500 });
    }
});
