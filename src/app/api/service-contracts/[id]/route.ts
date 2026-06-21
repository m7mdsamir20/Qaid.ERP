import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity, extractLogContext } from '@/lib/activityLog';

export const GET = withProtection(async (request, session, body, { params }) => {
    try {
        const { id } = await params;
        const companyId = (session.user as any).companyId;

        const contract = await prisma.serviceContract.findUnique({
            where: { id, companyId },
            include: {
                customer: { select: { id: true, name: true, phone: true } },
                workOrders: {
                    include: { customer: { select: { id: true, name: true } } },
                    orderBy: { orderNumber: 'desc' },
                },
            },
        });

        if (!contract) {
            return NextResponse.json({ error: 'عقد الخدمة غير موجود' }, { status: 404 });
        }

        return NextResponse.json(contract);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
});

export const PUT = withProtection(async (request, session, body, { params }) => {
    try {
        const { id } = await params;
        const companyId = (session.user as any).companyId;

        const existing = await prisma.serviceContract.findUnique({ where: { id, companyId } });
        if (!existing) {
            return NextResponse.json({ error: 'عقد الخدمة غير موجود' }, { status: 404 });
        }

        const { customerId, type, startDate, endDate, contractValue, billingCycle, autoRenew, status, description, terms } = body;

        const updated = await prisma.serviceContract.update({
            where: { id, companyId },
            data: {
                customerId: customerId !== undefined ? (customerId || null) : existing.customerId,
                type: type || existing.type,
                startDate: startDate ? new Date(startDate) : existing.startDate,
                endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : existing.endDate,
                contractValue: contractValue !== undefined ? parseFloat(contractValue) || 0 : existing.contractValue,
                billingCycle: billingCycle || existing.billingCycle,
                autoRenew: autoRenew !== undefined ? (autoRenew === true || autoRenew === 'true') : existing.autoRenew,
                status: status || existing.status,
                description: description !== undefined ? (description || null) : existing.description,
                terms: terms !== undefined ? (terms || null) : existing.terms,
            },
            include: { customer: { select: { id: true, name: true } } },
        });

        const padded = String(updated.contractNumber).padStart(5, '0');
        await logActivity({
            ...extractLogContext(session, request),
            action: 'update',
            module: 'service_contracts',
            entityType: 'ServiceContract',
            entityId: updated.id,
            entityRef: `SC-${padded}`,
            description: `حدّث عقد خدمة رقم SC-${padded}`,
        });

        return NextResponse.json(updated);
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: 'فشل في تحديث عقد الخدمة' }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session, body, { params }) => {
    try {
        const { id } = await params;
        const companyId = (session.user as any).companyId;

        const contract = await prisma.serviceContract.findUnique({ where: { id, companyId } });
        if (!contract) {
            return NextResponse.json({ error: 'عقد الخدمة غير موجود' }, { status: 404 });
        }

        if (contract.status !== 'draft') {
            return NextResponse.json({ error: 'لا يمكن حذف إلا العقود في حالة مسودة' }, { status: 400 });
        }

        await prisma.serviceContract.delete({ where: { id, companyId } });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: 'فشل في حذف عقد الخدمة' }, { status: 500 });
    }
});
