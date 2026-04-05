import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateNextCode } from '@/lib/autoId';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const url = new URL(request.url);
        const search = url.searchParams.get('search') || '';
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 200);
        const skip = (page - 1) * limit;
        const all = url.searchParams.get('all') === 'true'; // لصفحات الفواتير تحتاج كل الأصناف

        const where: any = { companyId };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { barcode: { contains: search } },
                { code: { contains: search } },
            ];
        }

        if (all) {
            // بدون pagination للاستخدام في الفواتير - بس بدون stocks
            const items = await prisma.item.findMany({
                where,
                orderBy: { name: 'asc' },
                include: { category: true, unit: true, stocks: true },
            });
            return NextResponse.json(items);
        }

        const [items, total] = await Promise.all([
            prisma.item.findMany({
                where,
                orderBy: { createdAt: 'asc' },
                skip,
                take: limit,
                include: { category: true, unit: true, stocks: true },
            }),
            prisma.item.count({ where }),
        ]);
        return NextResponse.json({ items, total, page, limit });
    } catch (error: any) {
        console.error("GET /api/items Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;

        // Auto-ID Logic (e.g. ITEM-001)
        const lastItem = await prisma.item.findFirst({
            where: { companyId, code: { startsWith: 'ITEM-' } },
            orderBy: { code: 'desc' }
        });

        const nextCode = generateNextCode(lastItem?.code, 'ITEM-', 3);

        const item = await prisma.$transaction(async (tx) => {
            const newItem = await tx.item.create({
                data: {
                    code: nextCode,
                    barcode: body.barcode || Math.floor(1000000000 + Math.random() * 9000000000).toString(),
                    name: body.name,
                    imageUrl: body.imageUrl || null,
                    unitId: body.unitId || null,
                    costPrice: parseFloat(body.costPrice) || 0,
                    sellPrice: parseFloat(body.sellPrice) || 0,
                    averageCost: parseFloat(body.costPrice) || 0,
                    minLimit: parseFloat(body.minLimit) || 0,
                    categoryId: body.categoryId || null,
                    description: body.description || null,
                    status: body.status || 'active',
                    companyId,
                },
            });

            // If warehouse is provided, initialize stock record
            if (body.warehouseId) {
                const initialQty = parseFloat(body.initialQuantity) || 0;
                await tx.stock.create({
                    data: {
                        itemId: newItem.id,
                        warehouseId: body.warehouseId,
                        quantity: initialQty,
                    }
                });

                if (initialQty > 0) {
                    await tx.stockMovement.create({
                        data: {
                            type: 'opening',
                            date: new Date(),
                            itemId: newItem.id,
                            warehouseId: body.warehouseId,
                            quantity: initialQty,
                            unitPrice: parseFloat(body.costPrice) || 0,
                            reference: 'OPEN-INV',
                            notes: 'رصيد افتتاحية عند إنشاء الصنف',
                            companyId,
                        }
                    });

                    // ③ OpeningBalance
                    const value = initialQty * (parseFloat(body.costPrice) || 0);

                    if (value > 0) {
                        const inventoryAccount = await tx.account.findFirst({
                            where: {
                                companyId,
                                type: 'asset',
                                accountCategory: 'detail',
                                isParent: false,
                                OR: [
                                    { name: { contains: 'مخزون' } },
                                    { name: { contains: 'بضاعة' } },
                                    { name: { contains: 'مخزن' } },
                                    { name: { contains: 'بضائع' } },
                                ],
                            },
                            orderBy: { code: 'asc' },
                        });

                        if (inventoryAccount) {
                            const currentYear = await tx.financialYear.findFirst({
                                where: { companyId, isOpen: true },
                                orderBy: { startDate: 'desc' },
                            });

                            if (currentYear) {
                                const existing = await tx.openingBalance.findUnique({
                                    where: {
                                        accountId_financialYearId: {
                                            accountId: inventoryAccount.id,
                                            financialYearId: currentYear.id,
                                        },
                                    },
                                });

                                if (existing) {
                                    await tx.openingBalance.update({
                                        where: { id: existing.id },
                                        data: { debit: existing.debit + value },
                                    });
                                } else {
                                    await tx.openingBalance.create({
                                        data: {
                                            accountId: inventoryAccount.id,
                                            financialYearId: currentYear.id,
                                            debit: value,
                                            credit: 0,
                                            companyId,
                                        },
                                    });
                                }
                            }
                        }
                    }
                }
            }

            return newItem;
        });
        return NextResponse.json(item, { status: 201 });
    } catch (error: any) {
        console.error("POST /api/items Error:", error);
        return NextResponse.json({ error: 'فشل في إنشاء الصنف', details: error.message }, { status: 500 });
    }
});

export const PUT = withProtection(async (request, session, body) => {
    try {
        const item = await prisma.item.update({
            where: { id: body.id },
            data: {
                name: body.name,
                barcode: body.barcode || Math.floor(1000000000 + Math.random() * 9000000000).toString(),
                imageUrl: body.imageUrl || null,
                unitId: body.unitId || null,
                costPrice: parseFloat(body.costPrice) || 0,
                sellPrice: parseFloat(body.sellPrice) || 0,
                averageCost: parseFloat(body.averageCost) || parseFloat(body.costPrice) || 0,
                minLimit: parseFloat(body.minLimit) || 0,
                categoryId: body.categoryId || null,
            },
        });
        return NextResponse.json(item);
    } catch {
        return NextResponse.json({ error: 'فشل في تعديل الصنف' }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'معرف الصنف مطلوب' }, { status: 400 });

        // ① صنف موجود في فواتير مبيعات أو مشتريات (ممنوع الحذف)
        const linkedInvoices = await prisma.invoiceLine.count({ where: { itemId: id } });
        if (linkedInvoices > 0) {
            return NextResponse.json({
                error: 'لا يمكن حذف الصنف لارتباطه بفواتير مسجلة'
            }, { status: 400 });
        }

        // ② صنف عنده حركات مخزنية: تحويلات أو جرد (ممنوع الحذف)
        const linkedTransfers = await prisma.warehouseTransferLine.count({ where: { itemId: id } });
        const linkedStocktakings = await prisma.stocktakingLine.count({ where: { itemId: id } });
        const otherMovements = await prisma.stockMovement.count({ 
            where: { itemId: id, type: { notIn: ['opening'] } } 
        });

        if (linkedTransfers > 0 || linkedStocktakings > 0 || otherMovements > 0) {
            return NextResponse.json({
                error: 'لا يمكن حذف الصنف لوجود حركات مخزنية'
            }, { status: 400 });
        }

        // ③ جيب بيانات الصنف للتحقق من الرصيد الافتتاحي
        const item = await prisma.item.findFirst({ 
            where: { id, companyId },
            include: { stocks: true }
        });
        if (!item) return NextResponse.json({ error: 'الصنف غير موجود' }, { status: 404 });

        // ④ تنفيذ الحذف والتعديلات المالية في ترانزاكشن واحد
        await prisma.$transaction(async (tx) => {
            // جيب حركة الرصيد الافتتاحي لو موجودة
            const openingMovement = await tx.stockMovement.findFirst({
                where: { itemId: id, type: 'opening', companyId }
            });

            if (openingMovement && openingMovement.quantity > 0) {
                const costToUse = openingMovement.unitPrice || item.costPrice;
                const value = openingMovement.quantity * costToUse;

                // خصم القيمة من الرصيد الافتتاحي للمخزون (من شجرة الحسابات)
                const inventoryAccount = await tx.account.findFirst({
                    where: {
                        companyId,
                        type: 'asset',
                        accountCategory: 'detail',
                        isParent: false,
                        OR: [
                            { name: { contains: 'مخزون' } },
                            { name: { contains: 'بضاعة' } },
                            { name: { contains: 'مخزن' } },
                            { name: { contains: 'بضائع' } },
                        ],
                    },
                    orderBy: { code: 'asc' },
                });

                if (inventoryAccount) {
                    const currentYear = await tx.financialYear.findFirst({
                        where: { companyId, isOpen: true },
                        orderBy: { startDate: 'desc' },
                    });

                    if (currentYear) {
                        const existing = await tx.openingBalance.findUnique({
                            where: {
                                accountId_financialYearId: {
                                    accountId: inventoryAccount.id,
                                    financialYearId: currentYear.id,
                                },
                            },
                        });

                        if (existing) {
                            const newDebit = Math.max(0, existing.debit - value);
                            if (newDebit === 0 && (existing.credit || 0) === 0) {
                                await tx.openingBalance.delete({ where: { id: existing.id } });
                            } else {
                                await tx.openingBalance.update({
                                    where: { id: existing.id },
                                    data: { debit: newDebit },
                                });
                            }
                        }
                    }
                }
            }

            // حذف التبعيات والصنف نهائياً
            await tx.stock.deleteMany({ where: { itemId: id } });
            await tx.stockMovement.deleteMany({ where: { itemId: id } });
            // Lines are already checked to be 0 at this point via pre-checks
            await tx.item.delete({ where: { id } });
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("DELETE /api/items Error:", error);
        return NextResponse.json({ error: 'فشل في حذف الصنف. قد يكون مرتبطاً بعمليات أخرى.' }, { status: 500 });
    }
});
