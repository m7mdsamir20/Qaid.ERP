import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { generateNextCode } from '@/lib/autoId';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const stocktakings = await prisma.stocktaking.findMany({
            where: { companyId },
            include: {
                warehouse: true,
                lines: { include: { item: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(stocktakings);
    } catch {
        return NextResponse.json([], { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const { date, warehouseId, notes, lines, status } = body;

        if (!warehouseId || !lines || lines.length === 0) {
            return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
        }

        // منع تطبيق الجرد بدون سنة مالية مفتوحة
        if (status === 'applied') {
            const openYear = await prisma.financialYear.findFirst({
                where: { companyId, isOpen: true }
            });
            if (!openYear) {
                return NextResponse.json({ error: "لا توجد سنة مالية مفتوحة. يرجى فتح سنة مالية أولاً" }, { status: 400 });
            }
        }

        const lastStocktaking = await prisma.stocktaking.findFirst({
            where: { companyId },
            orderBy: { stocktakingNum: 'desc' },
        });
        const stocktakingNum = (lastStocktaking?.stocktakingNum || 0) + 1;
        const code = generateNextCode(lastStocktaking?.code || '', 'STK-', 3);

        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Stocktaking Record
            const stocktaking = await tx.stocktaking.create({
                data: {
                    code,
                    stocktakingNum,
                    date: date ? new Date(date) : new Date(),
                    warehouseId,
                    notes: notes || null,
                    status: status || 'draft',
                    companyId,
                    lines: {
                        create: lines.map((l: any) => ({
                            itemId: l.itemId,
                            systemQuantity: l.systemQuantity,
                            actualQuantity: l.actualQuantity,
                            difference: l.difference,
                        }))
                    }
                },
                include: { lines: true }
            });

            // 2. Adjust Stock if status is 'applied'
            if (status === 'applied') {
                for (const line of lines) {
                    if (line.difference !== 0) {
                        await tx.stock.upsert({
                            where: { itemId_warehouseId: { itemId: line.itemId, warehouseId } },
                            update: { quantity: line.actualQuantity },
                            create: { itemId: line.itemId, warehouseId, quantity: line.actualQuantity },
                        });

                        await tx.stockMovement.create({
                            data: {
                                type: 'adjustment',
                                date: date ? new Date(date) : new Date(),
                                itemId: line.itemId,
                                warehouseId,
                                quantity: line.difference,
                                reference: code,
                                notes: `تسوية جرد - ${notes || ''}`,
                                companyId,
                            }
                        });
                    }
                }

                // 3. القيد المحاسبي لتسويات الجرد
                const linesWithDiff = lines.filter((l: any) => l.difference !== 0);
                if (linesWithDiff.length > 0) {
                    const activeYear = await tx.financialYear.findFirst({
                        where: { companyId, isOpen: true },
                        orderBy: { startDate: 'desc' }
                    });

                    if (activeYear) {
                        const [inventoryAcc, surplusAcc, shortageAcc] = await Promise.all([
                            // حساب المخزون
                            tx.account.findFirst({
                                where: { companyId, OR: [
                                    { code: '1131' },
                                    { name: { contains: 'مخزون' }, type: 'asset' },
                                    { name: { contains: 'بضائع' }, type: 'asset' },
                                ]}
                            }),
                            // إيراد عجز/فائض مخزون
                            tx.account.findFirst({
                                where: { companyId, type: 'revenue', OR: [
                                    { name: { contains: 'فائض مخزون' } },
                                    { name: { contains: 'إيرادات متنوعة' } },
                                ]}
                            }),
                            // مصروف نقص مخزون
                            tx.account.findFirst({
                                where: { companyId, type: 'expense', OR: [
                                    { name: { contains: 'نقص مخزون' } },
                                    { name: { contains: 'تكلفة المبيعات' } },
                                    { name: { contains: 'مصروفات أخرى' } },
                                ]}
                            }),
                        ]);

                        if (inventoryAcc) {
                            // جيب أسعار تكلفة الأصناف
                            const itemIds = linesWithDiff.map((l: any) => l.itemId);
                            const items = await tx.item.findMany({
                                where: { id: { in: itemIds }, companyId },
                                select: { id: true, averageCost: true, costPrice: true, name: true }
                            });
                            const itemMap = new Map(items.map((i: any) => [i.id, i]));

                            const jeLines: any[] = [];
                            for (const line of linesWithDiff) {
                                const item = itemMap.get(line.itemId) as any;
                                const costPrice = item?.averageCost || item?.costPrice || 0;
                                const diffValue = Math.abs(line.difference) * costPrice;
                                if (diffValue === 0) continue;

                                if (line.difference > 0) {
                                    // فائض مخزون: مدين المخزون / دائن إيراد فائض
                                    jeLines.push({ accountId: inventoryAcc.id, debit: diffValue, credit: 0, description: `فائض جرد — ${item?.name || line.itemId}` });
                                    if (surplusAcc) jeLines.push({ accountId: surplusAcc.id, debit: 0, credit: diffValue, description: `إيراد فائض جرد — ${item?.name || line.itemId}` });
                                } else {
                                    // عجز مخزون: مدين مصروف نقص / دائن المخزون
                                    if (shortageAcc) jeLines.push({ accountId: shortageAcc.id, debit: diffValue, credit: 0, description: `عجز جرد — ${item?.name || line.itemId}` });
                                    jeLines.push({ accountId: inventoryAcc.id, debit: 0, credit: diffValue, description: `نقص مخزون جرد — ${item?.name || line.itemId}` });
                                }
                            }

                            if (jeLines.length > 0) {
                                const lastEntry = await tx.journalEntry.findFirst({
                                    where: { companyId, financialYearId: activeYear.id },
                                    orderBy: { entryNumber: 'desc' },
                                    select: { entryNumber: true }
                                });
                                await tx.journalEntry.create({
                                    data: {
                                        entryNumber: (lastEntry?.entryNumber || 0) + 1,
                                        date: date ? new Date(date) : new Date(),
                                        description: `تسوية جرد ${code}`,
                                        referenceType: 'stocktaking',
                                        referenceId: stocktaking.id,
                                        financialYearId: activeYear.id,
                                        companyId,
                                        isPosted: true,
                                        lines: { create: jeLines }
                                    }
                                });
                            }
                        }
                    }
                }
            }

            return stocktaking;
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error('Stocktaking error:', error);
        return NextResponse.json({ error: 'فشل في إنشاء الجرد' }, { status: 500 });
    }
});
