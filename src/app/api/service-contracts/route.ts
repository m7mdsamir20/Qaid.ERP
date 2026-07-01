import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity, extractLogContext } from '@/lib/activityLog';
import { getBranchFilter } from '@/lib/apiAuth';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const customerId = searchParams.get('customerId');
        const type = searchParams.get('type');
        const branchId = searchParams.get('branchId');

        const where: any = { companyId };
        if (status) where.status = status;
        if (customerId) where.customerId = customerId;
        if (type) where.type = type;

        if (branchId && branchId !== 'all') {
            where.branchId = branchId;
        } else {
            const bf = getBranchFilter(session);
            if (bf.branchId) where.branchId = bf.branchId;
        }

        const contracts = await prisma.serviceContract.findMany({
            where,
            include: { customer: { select: { id: true, name: true } } },
            orderBy: { contractNumber: 'desc' },
        });

        return NextResponse.json(contracts);
    } catch (e) {
        console.error(e);
        return NextResponse.json([], { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const activeBranchId = (session.user as any).activeBranchId;
        const { customerId, type, startDate, endDate, contractValue, billingCycle, autoRenew, description, terms } = body;

        if (!type || !startDate || contractValue === undefined) {
            return NextResponse.json({ error: 'البيانات الأساسية مطلوبة (النوع، تاريخ البداية، قيمة العقد)' }, { status: 400 });
        }

        // Get next contractNumber
        const last = await prisma.serviceContract.findFirst({
            where: { companyId },
            orderBy: { contractNumber: 'desc' },
            select: { contractNumber: true },
        });
        const contractNumber = (last?.contractNumber || 0) + 1;

        const contract = await prisma.serviceContract.create({
            data: {
                contractNumber,
                customerId: customerId || null,
                type,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                contractValue: parseFloat(contractValue) || 0,
                billingCycle: billingCycle || 'monthly',
                autoRenew: autoRenew === true || autoRenew === 'true',
                status: 'draft',
                description: description || null,
                terms: terms || null,
                companyId,
                branchId: (activeBranchId && activeBranchId !== 'all') ? activeBranchId : null,
            },
            include: { customer: { select: { id: true, name: true } } },
        });

        const padded = String(contractNumber).padStart(5, '0');
        await logActivity({
            ...extractLogContext(session, request),
            action: 'create',
            module: 'service_contracts',
            entityType: 'ServiceContract',
            entityId: contract.id,
            entityRef: `SC-${padded}`,
            description: `أنشأ عقد خدمة رقم SC-${padded}`,
        });

        return NextResponse.json(contract, { status: 201 });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: 'فشل في إنشاء عقد الخدمة' }, { status: 500 });
    }
});
