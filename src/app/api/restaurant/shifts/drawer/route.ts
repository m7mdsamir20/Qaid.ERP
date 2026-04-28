import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const { shiftId, type, amount, notes, treasuryId } = body;

        if (!shiftId || !type || amount <= 0) {
            return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
        }

        const shift = await prisma.shift.findUnique({ where: { id: shiftId, companyId } });
        if (!shift || shift.status !== 'open') {
            return NextResponse.json({ error: 'الوردية مغلقة أو غير موجودة' }, { status: 400 });
        }

        // Update shift
        const updatedShift = await prisma.shift.update({
            where: { id: shiftId },
            data: {
                cashAdded: type === 'in' ? { increment: amount } : undefined,
                cashWithdrawn: type === 'out' ? { increment: amount } : undefined,
            }
        });

        // Add voucher if treasury is provided
        if (treasuryId) {
            const financialYear = await prisma.financialYear.findFirst({ where: { companyId, isOpen: true } });
            if (financialYear) {
                const lastVoucher = await prisma.voucher.findFirst({
                    where: { companyId, type: type === 'in' ? 'receipt' : 'payment' },
                    orderBy: { voucherNumber: 'desc' }
                });
                const nextNumber = (lastVoucher?.voucherNumber || 0) + 1;

                const voucher = await prisma.voucher.create({
                    data: {
                        voucherNumber: nextNumber,
                        type: type === 'in' ? 'receipt' : 'payment',
                        date: new Date(),
                        amount: amount,
                        description: `[الكاشير] ${type === 'in' ? 'إيداع نقدي' : 'سحب نقدي'} - وردية رقم ${shift.id.slice(-5)} - ${notes || ''}`,
                        treasuryId: treasuryId,
                        financialYearId: financialYear.id,
                        companyId: companyId,
                        branchId: shift.branchId
                    }
                });

                // Update Treasury balance
                await prisma.treasury.update({
                    where: { id: treasuryId },
                    data: { balance: type === 'in' ? { increment: amount } : { decrement: amount } }
                });
            }
        }

        return NextResponse.json({ success: true, shift: updatedShift });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
