import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session, body, context) => {
    try {
        const { id } = await context.params;
        const companyId = (session.user as any).companyId;

        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month');
        const year = searchParams.get('year');

        const costCenter = await prisma.costCenter.findFirst({
            where: { id, companyId },
            include: {
                journalLines: {
                    include: {
                        journalEntry: true,
                    },
                    where: (month && year) ? {
                        journalEntry: {
                            date: {
                                gte: new Date(Number(year), Number(month) - 1, 1),
                                lt: new Date(Number(year), Number(month), 1),
                            }
                        }
                    } : undefined,
                    orderBy: {
                        journalEntry: {
                            date: 'asc'
                        }
                    }
                }
            }
        });

        if (!costCenter) {
            return NextResponse.json({ error: "Cost center not found" }, { status: 404 });
        }

        // Add additional computed values
        const totalExpenses = costCenter.journalLines.reduce((acc, line) => acc + (line.debit || 0), 0);
        const transactionCount = costCenter.journalLines.length;

        // Current month and year expenses
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisYearStart = new Date(now.getFullYear(), 0, 1);

        const thisMonthExpenses = costCenter.journalLines
            .filter(line => new Date(line.journalEntry.date) >= thisMonthStart)
            .reduce((acc, line) => acc + (line.debit || 0), 0);

        const thisYearExpenses = costCenter.journalLines
            .filter(line => new Date(line.journalEntry.date) >= thisYearStart)
            .reduce((acc, line) => acc + (line.debit || 0), 0);

        return NextResponse.json({
            ...costCenter,
            description: (costCenter as any).description || null,
            isActive: (costCenter as any).isActive ?? true,
            totalExpenses,
            transactionCount,
            thisMonthExpenses,
            thisYearExpenses
        });
    } catch (error) {
        console.error('GET Cost Center Error:', error);
        return NextResponse.json({ error: 'Failed to find cost center' }, { status: 500 });
    }
});

export const PUT = withProtection(async (request, session, body, context) => {
    try {
        const { id } = await context.params;
        const companyId = (session.user as any).companyId;

        // Optional fields update
        const updateData: any = {};
        if (body.name !== undefined) updateData.name = body.name;
        
        // Only include description and isActive if they might exist
        try {
            if (body.description !== undefined) updateData.description = body.description;
            if (body.isActive !== undefined) updateData.isActive = body.isActive;
        } catch {}

        await prisma.costCenter.updateMany({
            where: {
                id,
                companyId,
            },
            data: updateData,
        });

        // Fetch the updated record to return it
        const updated = await prisma.costCenter.findFirst({
            where: { id, companyId }
        });

        if (!updated) {
            return NextResponse.json({ error: "Cost center not found" }, { status: 404 });
        }

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('PUT Cost Center Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to update cost center' }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session, body, context) => {
    try {
        const { id } = await context.params;
        const companyId = (session.user as any).companyId;

        // Check for attached journal lines
        const costCenter = await prisma.costCenter.findFirst({
            where: { id, companyId },
            include: { journalLines: true }
        });

        if (!costCenter) {
            return NextResponse.json({ error: "Cost center not found" }, { status: 404 });
        }

        if (costCenter.journalLines && costCenter.journalLines.length > 0) {
            return NextResponse.json({ error: 'لا يمكن حذف مركز تكلفة مرتبط بقيود محاسبية' }, { status: 400 });
        }

        // We use deleteMany so we can filter by companyId properly
        await prisma.costCenter.deleteMany({
            where: { id, companyId }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('DELETE Cost Center Error:', error);
        return NextResponse.json({ error: 'Failed to delete cost center' }, { status: 500 });
    }
});
