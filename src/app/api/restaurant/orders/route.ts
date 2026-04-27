import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

// GET: list orders with optional filters
export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const url = new URL(request.url);
        const type = url.searchParams.get('type');
        const status = url.searchParams.get('status');
        const shiftId = url.searchParams.get('shiftId');
        const limit = parseInt(url.searchParams.get('limit') ?? '50');

        const orders = await prisma.posOrder.findMany({
            where: {
                companyId,
                ...(type ? { type } : {}),
                ...(status ? { status } : {}),
                ...(shiftId ? { shiftId } : {}),
            },
            include: {
                lines: true,
                table: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        return NextResponse.json(orders);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

// POST: create a new POS order
export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;

        // Get next order number
        const last = await prisma.posOrder.findFirst({ where: { companyId }, orderBy: { orderNumber: 'desc' } });
        const orderNumber = (last?.orderNumber ?? 0) + 1;

        // Get active shift
        const activeShift = await prisma.shift.findFirst({ where: { companyId, status: 'open' } });

        const defaultWarehouse = await prisma.warehouse.findFirst({ where: { companyId }, orderBy: { createdAt: 'asc' } });

        // ════════════════════════════════════════════════════
        // PRE-CHECK INVENTORY (Warning when materials run out)
        // ════════════════════════════════════════════════════
        if (defaultWarehouse) {
            for (const line of body.lines as any[]) {
                const item = await prisma.item.findUnique({
                    where: { id: line.itemId },
                    include: { recipe: { include: { items: { include: { item: true } } } } }
                });

                if (item?.recipe && item.recipe.items.length > 0) {
                    for (const ri of item.recipe.items) {
                        const requiredQty = ri.quantity * line.quantity;
                        const stock = await prisma.stock.findUnique({
                            where: { itemId_warehouseId: { itemId: ri.itemId, warehouseId: defaultWarehouse.id } }
                        });
                        const available = stock?.quantity || 0;
                        if (available < requiredQty) {
                            return NextResponse.json({ 
                                error: `المواد الخام غير كافية لعمل "${item.name}". المتاح من "${ri.item.name}" هو ${available} فقط.` 
                            }, { status: 400 });
                        }
                    }
                }
            }
        }

        const subtotal = (body.lines as any[]).reduce((s: number, l: any) => s + (l.quantity * l.unitPrice - (l.discount ?? 0)), 0);
        const taxAmount = body.taxAmount ?? 0;
        const discount = body.discount ?? 0;
        const total = subtotal - discount + taxAmount;

        // Prepare payments with treasuryId
        const paymentsData = body.payments && body.payments.length > 0
            ? body.payments.map((p: any) => ({
                amount: p.amount,
                paymentMethod: p.paymentMethod,
                treasuryId: p.treasuryId || null
            }))
            : [];

        const order = await prisma.posOrder.create({
            data: {
                orderNumber,
                type: body.type ?? 'dine-in',
                status: 'pending',
                tableId: body.tableId ?? null,
                shiftId: activeShift?.id ?? null,
                customerId: body.customerId ?? null,
                deliveryName: body.deliveryName,
                deliveryPhone: body.deliveryPhone,
                deliveryAddress: body.deliveryAddress,
                notes: body.notes,
                subtotal,
                discount,
                taxAmount,
                total,
                paidAmount: body.paidAmount || 0,
                paymentMethod: body.paymentMethod,
                source: body.source ?? 'pos',
                externalRef: body.externalRef,
                driverId: body.driverId || null,
                companyId,
                lines: {
                    create: (body.lines as any[]).map((l: any) => ({
                        itemId: l.itemId,
                        itemName: l.itemName,
                        quantity: l.quantity,
                        unitPrice: l.unitPrice,
                        discount: l.discount ?? 0,
                        total: l.quantity * l.unitPrice - (l.discount ?? 0),
                        notes: l.notes,
                        modifiers: l.modifiers ? JSON.stringify(l.modifiers) : null,
                    })),
                },
                ...(paymentsData.length > 0 && {
                    payments: {
                        create: paymentsData
                    }
                })
            },
            include: { lines: true, table: true },
        });

        // Update table status to occupied
        if (body.tableId) {
            await prisma.restaurantTable.updateMany({
                where: { id: body.tableId, companyId },
                data: { status: 'occupied' },
            });
        }

        // Update shift sales counter
        if (activeShift) {
            await prisma.shift.update({
                where: { id: activeShift.id },
                data: {
                    totalSales: { increment: total },
                    totalOrders: { increment: 1 },
                },
            });
        }

        // ════════════════════════════════════════════════════
        // ACCOUNTING INTEGRATION: Create Invoice from POS Order
        // ════════════════════════════════════════════════════
        const activeYear = await prisma.financialYear.findFirst({ where: { companyId, isOpen: true } });
        // defaultWarehouse is already defined at the top

        if (activeYear) {
            try {
                const lastInvoice = await prisma.invoice.findFirst({
                    where: { companyId, type: 'sale' },
                    orderBy: { invoiceNumber: 'desc' }
                });
                const invoiceNumber = (lastInvoice?.invoiceNumber ?? 0) + 1;

                const invoice = await prisma.invoice.create({
                    data: {
                        invoiceNumber,
                        type: 'sale',
                        date: new Date(),
                        customerId: body.customerId || null,
                        subtotal,
                        discount,
                        taxEnabled: taxAmount > 0,
                        taxRate: body.taxRate || 0,
                        taxAmount,
                        total,
                        paidAmount: body.paidAmount,
                        remaining: total - body.paidAmount,
                        paymentMethod: body.paymentMethod || 'cash',
                        warehouseId: defaultWarehouse?.id ?? null,
                        companyId,
                        notes: `فاتورة كاشير - طلب رقم #${orderNumber}`,
                        lines: {
                            create: (body.lines as any[]).map((l: any) => ({
                                itemId: l.itemId,
                                quantity: l.quantity,
                                price: l.unitPrice,
                                discount: l.discount ?? 0,
                                total: l.quantity * l.unitPrice - (l.discount ?? 0),
                                unit: '',
                            }))
                        }
                    }
                });

                // Link Invoice to POS Order
                await prisma.posOrder.update({
                    where: { id: order.id },
                    data: { invoiceId: invoice.id }
                });

                // Update customer balance if applicable
                if (body.customerId) {
                    await prisma.customer.updateMany({
                        where: { id: body.customerId, companyId },
                        data: { balance: { decrement: total } }
                    });
                }
            } catch (e) {
                console.error('POS Invoice creation error (non-blocking):', e);
            }
        }

        // ════════════════════════════════════════════════════
        // TREASURY: Update treasury balances
        // ════════════════════════════════════════════════════
        if (paymentsData.length > 0) {
            for (const payment of paymentsData) {
                if (payment.treasuryId) {
                    try {
                        await prisma.treasury.update({
                            where: { id: payment.treasuryId },
                            data: { balance: { increment: payment.amount } }
                        });
                    } catch (e) {
                        console.error('Treasury update error (non-blocking):', e);
                    }
                }
            }
        }

        // ════════════════════════════════════════════════════
        // JOURNAL ENTRIES: Auto-create accounting entries
        // ════════════════════════════════════════════════════
        if (activeYear && total > 0) {
            try {
                // Find Cash account (parent code 1201 or name contains خزنة/نقدية) and Sales Revenue (4101 or إيرادات)
                const cashAccount = await prisma.account.findFirst({
                    where: { companyId, OR: [{ code: '1201' }, { code: '1200' }, { name: { contains: 'نقدية' } }, { name: { contains: 'خزنة' } }, { name: { contains: 'صندوق' } }] }
                });
                const salesAccount = await prisma.account.findFirst({
                    where: { companyId, OR: [{ code: '4101' }, { code: '4100' }, { name: { contains: 'إيرادات' } }, { name: { contains: 'مبيعات' } }] }
                });

                if (cashAccount && salesAccount) {
                    const lastEntry = await prisma.journalEntry.findFirst({
                        where: { companyId },
                        orderBy: { entryNumber: 'desc' }
                    });
                    const entryNumber = (lastEntry?.entryNumber ?? 0) + 1;

                    const lines: { accountId: string; debit: number; credit: number; description: string }[] = [
                        { accountId: salesAccount.id, debit: 0, credit: total, description: `إيرادات مبيعات - طلب #${orderNumber}` },
                    ];

                    if (body.paidAmount > 0) {
                        lines.push({ accountId: cashAccount.id, debit: body.paidAmount, credit: 0, description: `تحصيل طلب كاشير #${orderNumber}` });
                    }
                    
                    if (total - body.paidAmount > 0) {
                        // Find receivables account
                        const recAccount = await prisma.account.findFirst({
                            where: { companyId, OR: [{ code: '1121' }, { name: { contains: 'ذمم' } }, { name: { contains: 'عملاء' } }] }
                        });
                        if (recAccount) {
                            lines.push({ accountId: recAccount.id, debit: total - body.paidAmount, credit: 0, description: `ذمم (طاولة/عميل) - طلب #${orderNumber}` });
                        }
                    }

                    // If there's tax, add tax liability entry
                    if (taxAmount > 0) {
                        const taxAccount = await prisma.account.findFirst({
                            where: { companyId, OR: [{ code: '2201' }, { name: { contains: 'ضريبة' } }] }
                        });
                        if (taxAccount) {
                            // Adjust: Sales credit is subtotal only, tax goes to liability
                            lines[1].credit = subtotal - discount; // Net sales
                            lines.push({ accountId: taxAccount.id, debit: 0, credit: taxAmount, description: `ضريبة قيمة مضافة - طلب #${orderNumber}` });
                        }
                    }

                    await prisma.journalEntry.create({
                        data: {
                            entryNumber,
                            date: new Date(),
                            description: `قيد مبيعات كاشير - طلب #${orderNumber}`,
                            reference: `POS-${orderNumber}`,
                            referenceType: 'pos_order',
                            referenceId: order.id,
                            financialYearId: activeYear.id,
                            companyId,
                            isPosted: true,
                            lines: { create: lines }
                        }
                    });
                }
            } catch (e) {
                console.error('Journal entry creation error (non-blocking):', e);
            }
        }

        // ════════════════════════════════════════════════════
        // INVENTORY: Auto-Deduction Logic
        // ════════════════════════════════════════════════════
        if (defaultWarehouse) {
            for (const line of body.lines as any[]) {
                const item = await prisma.item.findUnique({
                    where: { id: line.itemId },
                    include: { recipe: { include: { items: true } } }
                });

                if (!item) continue;

                // 1. If it has a recipe, deduct recipe ingredients
                if (item.recipe && item.recipe.items.length > 0) {
                    for (const ri of item.recipe.items) {
                        const deductionQty = ri.quantity * line.quantity;
                        await prisma.stock.upsert({
                            where: { itemId_warehouseId: { itemId: ri.itemId, warehouseId: defaultWarehouse.id } },
                            create: { itemId: ri.itemId, warehouseId: defaultWarehouse.id, quantity: -deductionQty },
                            update: { quantity: { decrement: deductionQty } }
                        });
                        await prisma.stockMovement.create({
                            data: {
                                type: 'out',
                                date: new Date(),
                                itemId: ri.itemId,
                                warehouseId: defaultWarehouse.id,
                                quantity: deductionQty,
                                reference: `POS-${order.orderNumber}`,
                                notes: `استهلاك مكونات لوجبة ${item.name}`,
                                companyId
                            }
                        });
                    }
                } else if (item.type !== 'service') {
                    // بناءً على طلب المستخدم: المنتج التام لا يسحب بالسالب ولا يتم خصمه من المخزون إلا إذا كان له وصفة (مواد خام)
                    // لذلك قمنا بتعطيل الخصم المباشر للمنتج التام الذي ليس له وصفة
                }
                
                // 3. Deduct Modifiers Inventory
                if (line.modifiers) {
                    try {
                        const mods = typeof line.modifiers === 'string' ? JSON.parse(line.modifiers) : line.modifiers;
                        for (const mod of mods) {
                            if (mod.itemId) {
                                const deductionQty = line.quantity;
                                await prisma.stock.upsert({
                                    where: { itemId_warehouseId: { itemId: mod.itemId, warehouseId: defaultWarehouse.id } },
                                    create: { itemId: mod.itemId, warehouseId: defaultWarehouse.id, quantity: -deductionQty },
                                    update: { quantity: { decrement: deductionQty } }
                                });
                                await prisma.stockMovement.create({
                                    data: {
                                        type: 'out',
                                        date: new Date(),
                                        itemId: mod.itemId,
                                        warehouseId: defaultWarehouse.id,
                                        quantity: deductionQty,
                                        reference: `POS-${order.orderNumber}-MOD`,
                                        notes: `استهلاك إضافة (${mod.name}) لطلب الكاشير`,
                                        companyId
                                    }
                                });
                            }
                        }
                    } catch(e) {}
                }
            }
        }

        return NextResponse.json(order, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

// PUT: update order status
export const PUT = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        if (body.action === 'pay_and_close') {
            const order = await prisma.posOrder.findUnique({ where: { id: body.id, companyId }, include: { invoice: true } });
            if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
            
            const paymentAmount = order.total - order.paidAmount;
            
            // Update POS Order
            await prisma.posOrder.update({
                where: { id: order.id },
                data: { paidAmount: order.total, status: 'delivered', paymentMethod: body.paymentMethod || 'cash' }
            });
            
            // Free the table
            if (order.tableId) {
                await prisma.restaurantTable.updateMany({
                    where: { id: order.tableId, companyId },
                    data: { status: 'available' }
                });
            }
            
            // Update Invoice & Treasury & Accounting if there was an unpaid amount
            if (paymentAmount > 0) {
                if (order.invoiceId) {
                    await prisma.invoice.update({
                        where: { id: order.invoiceId },
                        data: {
                            paidAmount: order.total,
                            remaining: 0,
                            paymentMethod: body.paymentMethod || 'cash'
                        }
                    });
                }
                
                if (body.treasuryId) {
                    await prisma.treasury.update({
                        where: { id: body.treasuryId },
                        data: { balance: { increment: paymentAmount } }
                    });
                }
                
                // Accounting Entry
                const activeYear = await prisma.financialYear.findFirst({ where: { companyId, isOpen: true } });
                if (activeYear) {
                    const cashAccount = await prisma.account.findFirst({
                        where: { companyId, OR: [{ code: '1201' }, { code: '1200' }, { name: { contains: 'نقدية' } }, { name: { contains: 'خزنة' } }] }
                    });
                    const recAccount = await prisma.account.findFirst({
                        where: { companyId, OR: [{ code: '1121' }, { name: { contains: 'ذمم' } }, { name: { contains: 'عملاء' } }] }
                    });
                    
                    if (cashAccount && recAccount) {
                        const lastEntry = await prisma.journalEntry.findFirst({
                            where: { companyId },
                            orderBy: { entryNumber: 'desc' }
                        });
                        await prisma.journalEntry.create({
                            data: {
                                entryNumber: (lastEntry?.entryNumber ?? 0) + 1,
                                date: new Date(),
                                description: `تحصيل فاتورة آجل كاشير - طلب #${order.orderNumber}`,
                                financialYearId: activeYear.id,
                                companyId,
                                lines: {
                                    create: [
                                        { accountId: cashAccount.id, debit: paymentAmount, credit: 0, description: `تحصيل نقدي` },
                                        { accountId: recAccount.id, debit: 0, credit: paymentAmount, description: `إقفال ذمم` },
                                    ]
                                }
                            }
                        });
                    }
                }
            }
            return NextResponse.json({ success: true, message: 'تم الدفع وإخلاء الطاولة' });
        }

        await prisma.posOrder.updateMany({
            where: { id: body.id, companyId },
            data: {
                ...(body.status && { status: body.status }),
                ...(body.kitchenPrinted !== undefined && { kitchenPrinted: body.kitchenPrinted }),
                ...(body.paidAmount !== undefined && { paidAmount: body.paidAmount }),
                ...(body.paymentMethod && { paymentMethod: body.paymentMethod }),
            },
        });

        // If delivered/cancelled, free the table
        if (body.status === 'delivered' || body.status === 'cancelled') {
            const order = await prisma.posOrder.findUnique({ 
                where: { id: body.id }, 
                include: { lines: true } 
            });
            if (order?.tableId) {
                await prisma.restaurantTable.updateMany({
                    where: { id: order.tableId, companyId },
                    data: { status: 'available' },
                });
            }

            // Inventory Reversion for Cancellation
            if (body.status === 'cancelled' && body.revertInventory && order) {
                const defaultWarehouse = await prisma.warehouse.findFirst({ where: { companyId }, orderBy: { createdAt: 'asc' } });
                if (defaultWarehouse) {
                    for (const line of order.lines) {
                        const item = await prisma.item.findUnique({
                            where: { id: line.itemId },
                            include: { recipe: { include: { items: true } } }
                        });
                        if (!item) continue;

                        // 1. Return Recipe Ingredients
                        if (item.recipe && item.recipe.items.length > 0) {
                            for (const ri of item.recipe.items) {
                                const qty = ri.quantity * line.quantity;
                                await prisma.stock.upsert({
                                    where: { itemId_warehouseId: { itemId: ri.itemId, warehouseId: defaultWarehouse.id } },
                                    create: { itemId: ri.itemId, warehouseId: defaultWarehouse.id, quantity: qty },
                                    update: { quantity: { increment: qty } }
                                });
                                await prisma.stockMovement.create({
                                    data: {
                                        type: 'in', date: new Date(), itemId: ri.itemId, warehouseId: defaultWarehouse.id,
                                        quantity: qty, reference: `CANCEL-${order.orderNumber}`,
                                        notes: `مرتجع استهلاك مكونات لإلغاء طلب`, companyId
                                    }
                                });
                            }
                        } else if (item.type !== 'service') {
                            // 2. Return Standard Product
                            const qty = line.quantity;
                            await prisma.stock.upsert({
                                where: { itemId_warehouseId: { itemId: item.id, warehouseId: defaultWarehouse.id } },
                                create: { itemId: item.id, warehouseId: defaultWarehouse.id, quantity: qty },
                                update: { quantity: { increment: qty } }
                            });
                            await prisma.stockMovement.create({
                                data: {
                                    type: 'in', date: new Date(), itemId: item.id, warehouseId: defaultWarehouse.id,
                                    quantity: qty, reference: `CANCEL-${order.orderNumber}`,
                                    notes: `مرتجع كاشير (بدون وصفة)`, companyId
                                }
                            });
                        }

                        // 3. Return Modifiers
                        if (line.modifiers) {
                            try {
                                const mods = typeof line.modifiers === 'string' ? JSON.parse(line.modifiers) : line.modifiers;
                                for (const mod of mods) {
                                    if (mod.itemId) {
                                        const qty = line.quantity;
                                        await prisma.stock.upsert({
                                            where: { itemId_warehouseId: { itemId: mod.itemId, warehouseId: defaultWarehouse.id } },
                                            create: { itemId: mod.itemId, warehouseId: defaultWarehouse.id, quantity: qty },
                                            update: { quantity: { increment: qty } }
                                        });
                                        await prisma.stockMovement.create({
                                            data: {
                                                type: 'in', date: new Date(), itemId: mod.itemId, warehouseId: defaultWarehouse.id,
                                                quantity: qty, reference: `CANCEL-${order.orderNumber}-MOD`,
                                                notes: `مرتجع إضافة (${mod.name}) لإلغاء طلب`, companyId
                                            }
                                        });
                                    }
                                }
                            } catch(e) {}
                        }
                    }
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
