import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        
        const where: any = { companyId: session.companyId };
        if (projectId) where.projectId = projectId;

        const bills = await prisma.progressBill.findMany({
            where,
            include: {
                project: { select: { name: true } },
                lines: true
            },
            orderBy: { date: 'desc' }
        });

        return NextResponse.json(bills);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const lastBill = await prisma.progressBill.findFirst({
            where: { companyId: session.companyId },
            orderBy: { billNumber: 'desc' }
        });
        const nextNumber = (lastBill?.billNumber || 0) + 1;

        const bill = await prisma.$transaction(async (tx) => {
            const newBill = await tx.progressBill.create({
                data: {
                    billNumber: nextNumber,
                    projectId: body.projectId,
                    date: new Date(body.date),
                    subtotal: Number(body.subtotal) || 0,
                    retentionRate: Number(body.retentionRate) || 0,
                    retentionAmount: Number(body.retentionAmount) || 0,
                    advanceDeduction: Number(body.advanceDeduction) || 0,
                    otherDeductions: Number(body.otherDeductions) || 0,
                    netAmount: Number(body.netAmount) || 0,
                    remaining: Number(body.netAmount) || 0, // initially remaining is full net
                    status: body.status || 'draft',
                    notes: body.notes,
                    companyId: session.companyId,
                    lines: {
                        create: body.lines.map((line: any) => ({
                            phaseId: line.phaseId || null,
                            description: line.description,
                            quantity: Number(line.quantity) || 0,
                            unitPrice: Number(line.unitPrice) || 0,
                            previousPercent: Number(line.previousPercent) || 0,
                            currentPercent: Number(line.currentPercent) || 0,
                            completionPercent: Number(line.completionPercent) || 0,
                            amount: Number(line.amount) || 0
                        }))
                    }
                },
                include: { lines: true }
            });

            // Update project phases completion percentages if needed
            for (const line of body.lines) {
                if (line.phaseId && line.currentPercent > 0) {
                    await tx.projectPhase.update({
                        where: { id: line.phaseId },
                        data: {
                            completionPercent: { increment: Number(line.currentPercent) }
                        }
                    });
                }
            }

            return newBill;
        });

        return NextResponse.json(bill, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
