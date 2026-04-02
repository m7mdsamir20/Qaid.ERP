import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const deductions = await prisma.deduction.findMany({
            where: { companyId },
            include: { employee: true },
            orderBy: { date: 'desc' },
        });

        return NextResponse.json(deductions);
    } catch {
        return NextResponse.json([], { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const { employeeId, date, amount, reason } = body;

        if (!employeeId || !date || !amount) {
            return NextResponse.json({ 
                error: "اختر الموظف وحدد التاريخ والمبلغ" 
            }, { status: 400 });
        }

        // ← بس بتسجل الخصم بحالة pending بدون أي قيد
        const employee = await prisma.employee.findUnique({
            where: { id: employeeId, companyId }
        });

        if (!employee) {
            return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });
        }

        if (employee.status !== 'active') {
            return NextResponse.json({ error: "لا يمكن إضافة خصم لموظف غير نشط" }, { status: 400 });
        }

        const deduction = await prisma.deduction.create({
            data: {
                employeeId,
                date: new Date(date),
                amount: Number(amount),
                reason: reason || null,
                status: 'pending',
                companyId,
            },
            include: { employee: true }
        });

        return NextResponse.json(deduction, { status: 201 });
    } catch (e) {
        return NextResponse.json({ 
            error: "فشل في تسجيل الخصم" 
        }, { status: 500 });
    }
});
