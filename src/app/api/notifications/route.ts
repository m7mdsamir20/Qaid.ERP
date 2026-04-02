import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '10');

        // Check if we need to generate new notifications based on settings
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { notificationSettings: true }
        });

        if (company?.notificationSettings) {
            const settings = JSON.parse(company.notificationSettings);
            
            // ─── Late Payment Notifications ───
            if (settings.latePayment?.enabled) {
                const now = new Date();
                const lateInstallments = await prisma.installment.findMany({
                    where: {
                        companyId,
                        status: 'pending',
                        dueDate: { lt: now },
                        remaining: { gt: 0 }
                    },
                    include: { plan: { include: { customer: true } } }
                });

                for (const inst of lateInstallments) {
                    const uniqueTag = `late_inst_${inst.id}`;
                    // Check if notification already exists
                    const exists = await prisma.notification.findFirst({
                        where: { companyId, msg: { contains: uniqueTag } }
                    });

                    if (!exists) {
                        await prisma.notification.create({
                            data: {
                                companyId,
                                type: 'overdue_payment',
                                priority: 'high',
                                msg: `قسط متأخر للعميل ${inst.plan.customer.name} - المبلغ: ${inst.remaining.toLocaleString()} [${uniqueTag}]`,
                                link: `/installments/${inst.planId}`,
                            }
                        });
                    }
                }
            }
        }

        const notifications = await prisma.notification.findMany({
            where: { 
                companyId,
            },
            orderBy: { createdAt: 'desc' },
            take: limit
        });

        return NextResponse.json(notifications);
    } catch (error) {
        console.error('Notifications fetch failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const { ids } = body;

        if (ids && ids.length > 0) {
            await prisma.notification.updateMany({
                where: { 
                    id: { in: ids },
                    companyId
                },
                data: { read: true }
            });
        } else {
            // Mark ALL as read
            await prisma.notification.updateMany({
                where: { 
                    companyId,
                    read: false
                },
                data: { read: true }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Notifications update failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
});
