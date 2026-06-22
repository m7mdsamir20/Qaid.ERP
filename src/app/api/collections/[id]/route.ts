import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity, extractLogContext } from '@/lib/activityLog';

export const GET = withProtection(async (request: NextRequest, session: any, _body: any, context: any) => {
    const { id } = await context.params;
    const companyId = (session.user as any).companyId;

    const collection = await (prisma as any).collection.findFirst({
        where: { id, companyId },
        include: {
            salesRep: { select: { id: true, name: true } },
            customer: { select: { id: true, name: true } },
            invoice: { select: { id: true, invoiceNumber: true } },
            treasury: { select: { id: true, name: true } },
        },
    });

    if (!collection) {
        return NextResponse.json({ error: 'التحصيل غير موجود' }, { status: 404 });
    }

    return NextResponse.json(collection);
});

export const PATCH = withProtection(async (request: NextRequest, session: any, body: any, context: any) => {
    const { id } = await context.params;
    const companyId = (session.user as any).companyId;
    const userId = (session.user as any).id;

    const { action, treasuryId } = body;

    const collection = await (prisma as any).collection.findFirst({
        where: { id, companyId },
    });

    if (!collection) {
        return NextResponse.json({ error: 'التحصيل غير موجود' }, { status: 404 });
    }

    if (action === 'update') {
        if (collection.status !== 'pending') {
            return NextResponse.json({ error: 'لا يمكن تعديل تحصيل مُعتمد' }, { status: 400 });
        }
        const { amount, method, checkNumber, checkDueDate, bankName, notes, date } = body;
        const updated = await (prisma as any).collection.update({
            where: { id },
            data: {
                amount: amount !== undefined ? Number(amount) : undefined,
                method: method || undefined,
                checkNumber: checkNumber || null,
                checkDueDate: checkDueDate || null,
                bankName: bankName || null,
                notes: notes || null,
                date: date ? new Date(date) : undefined,
            },
        });
        const ctx = extractLogContext(session, request);
        await logActivity({
            ...ctx,
            action: 'update',
            module: 'collections',
            entityType: 'Collection',
            entityId: id,
            description: `عدّل بيانات تحصيل بمبلغ ${updated.amount}`,
            newData: { amount, method, checkNumber, checkDueDate },
        });
        return NextResponse.json(updated);
    }

    if (action === 'deposit') {
        if (collection.status !== 'pending') {
            return NextResponse.json({ error: 'يمكن إيداع التحصيلات بحالة "معلق" فقط' }, { status: 400 });
        }
        if (!treasuryId) {
            return NextResponse.json({ error: 'يرجى تحديد الخزينة' }, { status: 400 });
        }

        const updated = await prisma.$transaction(async (tx) => {
            // Update treasury balance
            await (tx as any).treasury.update({
                where: { id: treasuryId },
                data: { balance: { increment: collection.amount } },
            });

            // Update collection
            const updatedCollection = await (tx as any).collection.update({
                where: { id },
                data: {
                    status: 'deposited',
                    treasuryId,
                    depositedAt: new Date(),
                    depositedBy: userId,
                },
            });

            // Update invoice remaining if linked
            if (collection.invoiceId) {
                const invoice = await (tx as any).invoice.findUnique({
                    where: { id: collection.invoiceId },
                    select: { remaining: true },
                });
                if (invoice) {
                    const newRemaining = Math.max(0, (invoice.remaining || 0) - collection.amount);
                    await (tx as any).invoice.update({
                        where: { id: collection.invoiceId },
                        data: { remaining: newRemaining },
                    });
                }
            }

            return updatedCollection;
        });

        const ctx = extractLogContext(session, request);
        await logActivity({
            ...ctx,
            action: 'approve',
            module: 'collections',
            entityType: 'Collection',
            entityId: id,
            description: `أودع تحصيلاً بمبلغ ${collection.amount} في الخزينة`,
            newData: { status: 'deposited', treasuryId },
        });

        return NextResponse.json(updated);
    }

    if (action === 'return') {
        const wasDeposited = collection.status === 'deposited';

        const updated = await prisma.$transaction(async (tx) => {
            // Reverse treasury balance if was deposited
            if (wasDeposited && collection.treasuryId) {
                await (tx as any).treasury.update({
                    where: { id: collection.treasuryId },
                    data: { balance: { decrement: collection.amount } },
                });
            }

            // Update collection status
            const updatedCollection = await (tx as any).collection.update({
                where: { id },
                data: { status: 'returned' },
            });

            // Restore invoice remaining if it was deposited and linked
            if (wasDeposited && collection.invoiceId) {
                const invoice = await (tx as any).invoice.findUnique({
                    where: { id: collection.invoiceId },
                    select: { remaining: true, total: true },
                });
                if (invoice) {
                    await (tx as any).invoice.update({
                        where: { id: collection.invoiceId },
                        data: { remaining: (invoice.remaining || 0) + collection.amount },
                    });
                }
            }

            return updatedCollection;
        });

        const ctx = extractLogContext(session, request);
        await logActivity({
            ...ctx,
            action: 'update',
            module: 'collections',
            entityType: 'Collection',
            entityId: id,
            description: `إرجاع تحصيل بمبلغ ${collection.amount}`,
            oldData: { status: collection.status },
            newData: { status: 'returned' },
        });

        return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
});

export const DELETE = withProtection(async (request: NextRequest, session: any, _body: any, context: any) => {
    const { id } = await context.params;
    const companyId = (session.user as any).companyId;

    const collection = await (prisma as any).collection.findFirst({
        where: { id, companyId },
    });

    if (!collection) {
        return NextResponse.json({ error: 'التحصيل غير موجود' }, { status: 404 });
    }

    if (collection.status !== 'pending') {
        return NextResponse.json({ error: 'لا يمكن حذف إلا التحصيلات المعلقة' }, { status: 400 });
    }

    await (prisma as any).collection.delete({ where: { id } });

    const ctx = extractLogContext(session, request);
    await logActivity({
        ...ctx,
        action: 'delete',
        module: 'collections',
        entityType: 'Collection',
        entityId: id,
        description: `حذف تحصيل بمبلغ ${collection.amount}`,
        oldData: { amount: collection.amount, method: collection.method },
    });

    return NextResponse.json({ message: 'تم حذف التحصيل بنجاح' });
});
