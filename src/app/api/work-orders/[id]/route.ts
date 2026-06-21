import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity, extractLogContext } from '@/lib/activityLog';

export const GET = withProtection(async (request, session, body, { params }) => {
    try {
        const { id } = await params;
        const companyId = (session.user as any).companyId;

        const workOrder = await prisma.workOrder.findUnique({
            where: { id, companyId },
            include: {
                customer: { select: { id: true, name: true, phone: true } },
                contract: { select: { id: true, contractNumber: true, type: true } },
                assignedEmployee: { select: { id: true, name: true, position: true } },
                materials: { include: { item: true } },
            },
        });

        if (!workOrder) {
            return NextResponse.json({ error: 'أمر العمل غير موجود' }, { status: 404 });
        }

        return NextResponse.json(workOrder);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
});

export const PUT = withProtection(async (request, session, body, { params }) => {
    try {
        const { id } = await params;
        const companyId = (session.user as any).companyId;

        const existing = await prisma.workOrder.findUnique({ where: { id, companyId } });
        if (!existing) {
            return NextResponse.json({ error: 'أمر العمل غير موجود' }, { status: 404 });
        }

        const { status, customerId, contractId, customerPONumber, assignedTo, type, priority, scheduledDate, description, notes, resolution, materials } = body;

        // Status transition timestamps
        let startedAt = existing.startedAt;
        let completedAt = existing.completedAt;
        const newStatus = status || existing.status;

        if (status === 'in_progress' && existing.status !== 'in_progress') {
            startedAt = new Date();
        }
        if (status === 'completed' && existing.status !== 'completed') {
            completedAt = new Date();
        }

        const updated = await prisma.workOrder.update({
            where: { id, companyId },
            data: {
                status: newStatus,
                customerId: customerId !== undefined ? (customerId || null) : existing.customerId,
                contractId: contractId !== undefined ? (contractId || null) : existing.contractId,
                customerPONumber: customerPONumber !== undefined ? (customerPONumber || null) : existing.customerPONumber,
                assignedTo: assignedTo !== undefined ? (assignedTo || null) : existing.assignedTo,
                type: type || existing.type,
                priority: priority || existing.priority,
                scheduledDate: scheduledDate !== undefined ? (scheduledDate ? new Date(scheduledDate) : null) : existing.scheduledDate,
                description: description || existing.description,
                notes: notes !== undefined ? (notes || null) : existing.notes,
                resolution: resolution !== undefined ? (resolution || null) : existing.resolution,
                startedAt,
                completedAt,
                ...(materials !== undefined ? {
                    materials: {
                        deleteMany: {},
                        create: materials.map((m: any) => ({
                            itemId: m.itemId,
                            quantity: parseFloat(m.quantity) || 1,
                            unitPrice: parseFloat(m.unitPrice) || 0,
                            total: (parseFloat(m.quantity) || 1) * (parseFloat(m.unitPrice) || 0),
                            unit: m.unit || null,
                        })),
                    },
                } : {}),
            },
            include: {
                customer: { select: { id: true, name: true } },
                contract: { select: { id: true, contractNumber: true } },
                assignedEmployee: { select: { id: true, name: true } },
                materials: { include: { item: true } },
            },
        });

        const padded = String(updated.orderNumber).padStart(5, '0');
        await logActivity({
            ...extractLogContext(session, request),
            action: 'update',
            module: 'work_orders',
            entityType: 'WorkOrder',
            entityId: updated.id,
            entityRef: `WO-${padded}`,
            description: status
                ? `غيّر حالة أمر عمل رقم WO-${padded} إلى ${status}`
                : `حدّث أمر عمل رقم WO-${padded}`,
        });

        return NextResponse.json(updated);
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: 'فشل في تحديث أمر العمل' }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session, body, { params }) => {
    try {
        const { id } = await params;
        const companyId = (session.user as any).companyId;

        const workOrder = await prisma.workOrder.findUnique({ where: { id, companyId } });
        if (!workOrder) {
            return NextResponse.json({ error: 'أمر العمل غير موجود' }, { status: 404 });
        }

        if (workOrder.status !== 'new') {
            return NextResponse.json({ error: 'لا يمكن حذف إلا أوامر العمل الجديدة' }, { status: 400 });
        }

        await prisma.workOrder.delete({ where: { id, companyId } });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: 'فشل في حذف أمر العمل' }, { status: 500 });
    }
});
