import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity, extractLogContext } from '@/lib/activityLog';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const customerId = searchParams.get('customerId');
        const contractId = searchParams.get('contractId');
        const assignedTo = searchParams.get('assignedTo');
        const priority = searchParams.get('priority');
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');

        const where: any = { companyId };
        if (status) where.status = status;
        if (customerId) where.customerId = customerId;
        if (contractId) where.contractId = contractId;
        if (assignedTo) where.assignedTo = assignedTo;
        if (priority) where.priority = priority;
        if (dateFrom || dateTo) {
            where.scheduledDate = {};
            if (dateFrom) where.scheduledDate.gte = new Date(dateFrom);
            if (dateTo) where.scheduledDate.lte = new Date(dateTo);
        }

        const workOrders = await prisma.workOrder.findMany({
            where,
            include: {
                customer: { select: { id: true, name: true } },
                contract: { select: { id: true, contractNumber: true } },
                assignedEmployee: { select: { id: true, name: true } },
            },
            orderBy: { orderNumber: 'desc' },
        });

        return NextResponse.json(workOrders);
    } catch (e) {
        console.error(e);
        return NextResponse.json([], { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const { customerId, contractId, customerPONumber, assignedTo, type, priority, scheduledDate, description, notes, materials } = body;

        if (!type || !description) {
            return NextResponse.json({ error: 'البيانات الأساسية مطلوبة (النوع، الوصف)' }, { status: 400 });
        }

        // Get next orderNumber
        const last = await prisma.workOrder.findFirst({
            where: { companyId },
            orderBy: { orderNumber: 'desc' },
            select: { orderNumber: true },
        });
        const orderNumber = (last?.orderNumber || 0) + 1;

        const workOrder = await prisma.workOrder.create({
            data: {
                orderNumber,
                customerId: customerId || null,
                contractId: contractId || null,
                customerPONumber: customerPONumber || null,
                assignedTo: assignedTo || null,
                type,
                priority: priority || 'normal',
                scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
                status: assignedTo ? 'assigned' : 'new',
                description,
                notes: notes || null,
                companyId,
                materials: materials && materials.length > 0 ? {
                    create: materials.map((m: any) => ({
                        itemId: m.itemId,
                        quantity: parseFloat(m.quantity) || 1,
                        unitPrice: parseFloat(m.unitPrice) || 0,
                        total: (parseFloat(m.quantity) || 1) * (parseFloat(m.unitPrice) || 0),
                        unit: m.unit || null,
                    })),
                } : undefined,
            },
            include: {
                customer: { select: { id: true, name: true } },
                contract: { select: { id: true, contractNumber: true } },
                assignedEmployee: { select: { id: true, name: true } },
                materials: { include: { item: true } },
            },
        });

        const padded = String(orderNumber).padStart(5, '0');
        await logActivity({
            ...extractLogContext(session, request),
            action: 'create',
            module: 'work_orders',
            entityType: 'WorkOrder',
            entityId: workOrder.id,
            entityRef: `WO-${padded}`,
            description: `أنشأ أمر عمل رقم WO-${padded}`,
        });

        return NextResponse.json(workOrder, { status: 201 });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: 'فشل في إنشاء أمر العمل' }, { status: 500 });
    }
});
