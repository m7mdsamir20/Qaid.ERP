import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity, extractLogContext } from '@/lib/activityLog';

function calcDaysCount(start: Date, end: Date): number {
    const diff = end.getTime() - start.getTime();
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
}

export const GET = withProtection(async (request, session) => {
    const companyId = (session.user as any).companyId;
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const employeeId = searchParams.get('employeeId');
    const type = searchParams.get('type');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const where: any = { companyId };
    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;
    if (type) where.type = type;
    if (month && year) {
        const y = parseInt(year);
        const m = parseInt(month) - 1;
        where.startDate = {
            gte: new Date(y, m, 1),
            lt: new Date(y, m + 1, 1),
        };
    }

    const leaves = await prisma.leaveRequest.findMany({
        where,
        include: { employee: { include: { department: true } } },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(leaves);
});

export const POST = withProtection(async (request, session, body) => {
    const companyId = (session.user as any).companyId;
    const { employeeId, type, startDate, endDate, reason, notes } = body;

    if (!employeeId || !type || !startDate || !endDate) {
        return NextResponse.json({ error: 'بيانات ناقصة: الموظف، النوع، تاريخ البداية والنهاية مطلوبة' }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (end < start) {
        return NextResponse.json({ error: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية' }, { status: 400 });
    }

    const daysCount = calcDaysCount(start, end);

    // Check leave balance for types that have balance limits
    if (type !== 'unpaid') {
        const currentYear = start.getFullYear();
        const balance = await prisma.leaveBalance.findFirst({
            where: { employeeId, year: currentYear, type, companyId },
        });

        if (balance && balance.remaining < daysCount) {
            return NextResponse.json(
                { error: `رصيد الإجازة غير كافٍ. المتاح: ${balance.remaining} يوم، المطلوب: ${daysCount} يوم` },
                { status: 400 }
            );
        }
    }

    const leave = await prisma.leaveRequest.create({
        data: {
            employeeId,
            type,
            startDate: start,
            endDate: end,
            daysCount,
            reason: reason || null,
            notes: notes || null,
            status: 'pending',
            companyId,
        },
        include: { employee: true },
    });

    await logActivity({
        ...extractLogContext(session, request),
        action: 'create',
        module: 'attendance',
        entityType: 'LeaveRequest',
        entityId: leave.id,
        description: `طلب إجازة للموظف ${leave.employee.name} (${daysCount} يوم)`,
    });

    return NextResponse.json(leave, { status: 201 });
});

export const PUT = withProtection(async (request, session, body) => {
    const companyId = (session.user as any).companyId;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const { status, notes } = body;

    if (!id) return NextResponse.json({ error: 'معرف الطلب مطلوب' }, { status: 400 });
    if (!['approved', 'rejected'].includes(status)) {
        return NextResponse.json({ error: 'الحالة يجب أن تكون approved أو rejected' }, { status: 400 });
    }

    const user = session.user as any;

    // Find the existing leave request
    const leave = await prisma.leaveRequest.findFirst({
        where: { id, companyId },
        include: { employee: true },
    });

    if (!leave) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
    if (leave.status !== 'pending') {
        return NextResponse.json({ error: 'الطلب تمت معالجته مسبقاً' }, { status: 400 });
    }

    // Update the leave request
    const updated = await prisma.leaveRequest.update({
        where: { id },
        data: {
            status,
            notes: notes || null,
            approvedBy: user.name || user.id,
            approvedAt: new Date(),
        },
    });

    if (status === 'approved') {
        // Update leave balance
        const currentYear = leave.startDate.getFullYear();
        if (leave.type !== 'unpaid') {
            await prisma.leaveBalance.upsert({
                where: { employeeId_year_type: { employeeId: leave.employeeId, year: currentYear, type: leave.type } },
                create: {
                    employeeId: leave.employeeId,
                    year: currentYear,
                    type: leave.type,
                    entitled: 21,
                    used: leave.daysCount,
                    remaining: 21 - leave.daysCount,
                    companyId,
                },
                update: {
                    used: { increment: leave.daysCount },
                    remaining: { decrement: leave.daysCount },
                },
            });
        }

        // Create AttendanceRecord entries for each leave day
        const leaveRecords: any[] = [];
        const currentDate = new Date(leave.startDate);
        while (currentDate <= leave.endDate) {
            const dateSnap = new Date(currentDate);
            dateSnap.setHours(0, 0, 0, 0);
            leaveRecords.push({
                employeeId: leave.employeeId,
                date: dateSnap,
                status: 'on_leave',
                workHours: 0,
                lateMinutes: 0,
                overtimeHours: 0,
                notes: `إجازة ${leave.type} - ${leave.reason || ''}`,
                source: 'leave',
                companyId,
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Upsert each day record
        for (const rec of leaveRecords) {
            await prisma.attendanceRecord.upsert({
                where: { employeeId_date: { employeeId: rec.employeeId, date: rec.date } },
                create: rec,
                update: { status: 'on_leave', notes: rec.notes, source: 'leave' },
            });
        }
    }

    await logActivity({
        ...extractLogContext(session, request),
        action: status === 'approved' ? 'approve' : 'reject',
        module: 'attendance',
        entityType: 'LeaveRequest',
        entityId: id,
        description: `${status === 'approved' ? 'اعتماد' : 'رفض'} إجازة الموظف ${leave.employee.name}`,
    });

    return NextResponse.json(updated);
});
