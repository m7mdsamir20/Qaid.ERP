import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { generateNextCode } from '@/lib/autoId';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const activeBranchId = (session.user as any).activeBranchId;
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId') || activeBranchId;

        const where: any = { companyId };
        if (branchId && branchId !== 'all') where.branchId = branchId;

        const warehouses = await prisma.warehouse.findMany({
            where,
            orderBy: { createdAt: 'asc' },
            include: { _count: { select: { stocks: true } } },
        });
        return NextResponse.json(warehouses);
    } catch {
        return NextResponse.json([], { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;

        const lastWarehouse = await prisma.warehouse.findFirst({
            where: { companyId, code: { startsWith: 'WH-' } },
            orderBy: { code: 'desc' }
        });

        const nextCode = generateNextCode(lastWarehouse?.code, 'WH-', 3);

        const activeBranchId = (session.user as any).activeBranchId;
        const warehouse = await prisma.warehouse.create({
            data: {
                name: body.name,
                code: nextCode,
                address: body.address || null,
                companyId,
                branchId: body.branchId || activeBranchId || null,
            },
        } as any);
        return NextResponse.json(warehouse, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'فشل في إنشاء المخزن' }, { status: 500 });
    }
});

export const PUT = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const warehouse = await prisma.warehouse.update({
            where: { id: body.id, companyId },
            data: {
                name: body.name,
                address: body.address || null,
            },
        });
        return NextResponse.json(warehouse);
    } catch {
        return NextResponse.json({ error: 'فشل في تعديل المخزن' }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'معرف المخزن مطلوب' }, { status: 400 });

        // ① تأكد من عدم وجود حركات (فواتير مشتريات أو مبيعات)
        const hasInvoices = await prisma.invoice.findFirst({
            where: { warehouseId: id, companyId }
        });
        if (hasInvoices) {
            return NextResponse.json({ error: 'لا يمكن حذف المخزن لارتباطه بحركات مخزنية' }, { status: 400 });
        }

        // ② تأكد من عدم وجود حركات (تحويلات مخزنية)
        const hasTransfers = await prisma.warehouseTransfer.findFirst({
            where: { OR: [{ fromWarehouseId: id }, { toWarehouseId: id }], companyId }
        });
        if (hasTransfers) {
            return NextResponse.json({ error: 'لا يمكن حذف المخزن لارتباطه بحركات مخزنية' }, { status: 400 });
        }

        // ③ تأكد من عدم وجود حركات (جرد)
        const hasStocktaking = await prisma.stocktaking.findFirst({
            where: { warehouseId: id, companyId }
        });
        if (hasStocktaking) {
            return NextResponse.json({ error: 'لا يمكن حذف المخزن لارتباطه بحركات مخزنية' }, { status: 400 });
        }

        // ④ تأكد من عدم وجود حركات حقيقية (غير الافتتاحية)
        const hasRealMovements = await prisma.stockMovement.findFirst({
            where: { warehouseId: id, companyId, type: { not: 'opening' } }
        });
        if (hasRealMovements) {
            return NextResponse.json({ error: 'لا يمكن حذف المخزن لارتباطه بحركات مخزنية' }, { status: 400 });
        }

        // ⑤ لو تمام — امسح المخزن والافتتاحية في ترازاكشن
        await prisma.$transaction(async (tx) => {

            // أ. جيب كل الحركات الافتتاحية للمخزن ده
            const openingMovements = await tx.stockMovement.findMany({
                where: { warehouseId: id, companyId, type: 'opening' },
                include: { item: true }
            });

            // ب. احسب قيمتهن الافتتاحية
            let totalOpeningValue = 0;
            for (const mov of openingMovements) {
                totalOpeningValue += (mov.quantity * (mov.item.costPrice || 0));
            }

            // ج. لو في قيمة — اطرحها من شجرة الحسابات (حساب المخزون)
            if (totalOpeningValue > 0) {
                const inventoryAccount = await tx.account.findFirst({
                    where: {
                        companyId,
                        isParent: false,
                        accountCategory: 'detail',
                        OR: [
                            { name: { contains: 'مخزون' } } ,
                            { name: { contains: 'بضاعة' } } ,
                            { name: { contains: 'مخزن' } } ,
                        ]
                    },
                    orderBy: { code: 'asc' }
                });

                if (inventoryAccount) {
                    const currentYear = await tx.financialYear.findFirst({
                        where: { companyId, isOpen: true },
                        orderBy: { startDate: 'desc' }
                    });
                    if (currentYear) {
                        const openingBal = await tx.openingBalance.findUnique({
                            where: {
                                accountId_financialYearId: {
                                    accountId: inventoryAccount.id,
                                    financialYearId: currentYear.id
                                }
                            }
                        });
                        if (openingBal) {
                            await tx.openingBalance.update({
                                where: { id: openingBal.id },
                                data: { debit: Math.max(0, openingBal.debit - totalOpeningValue) }
                            });
                        }
                    }
                }
            }

            // د. امسح الحركات والقيود والمخزن
            await tx.stockMovement.deleteMany({ where: { warehouseId: id, companyId } });
            await tx.stock.deleteMany({ where: { warehouseId: id } });
            await tx.warehouse.delete({ where: { id, companyId } });
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("DELETE /api/warehouses Error:", e);
        return NextResponse.json({ error: 'فشل في حذف المخزن. ربما يكون مرتبطاً بعمليات أخرى.' }, { status: 500 });
    }
});
