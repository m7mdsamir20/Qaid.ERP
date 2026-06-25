import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity, extractLogContext } from '@/lib/activityLog';

// Helper: parse "HH:MM" into minutes from midnight
function timeToMinutes(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

// Helper: diff between two DateTime in hours
function diffHours(a: Date, b: Date): number {
    return Math.max(0, (b.getTime() - a.getTime()) / (1000 * 60 * 60));
}

export const GET = withProtection(async (request, session) => {
    const companyId = (session.user as any).companyId;
    const { searchParams } = new URL(request.url);

    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const where: any = { companyId };

    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) where.date.gte = new Date(dateFrom);
        if (dateTo) {
            const end = new Date(dateTo);
            end.setHours(23, 59, 59, 999);
            where.date.lte = end;
        }
    } else if (month && year) {
        const y = parseInt(year);
        const m = parseInt(month) - 1;
        where.date = {
            gte: new Date(y, m, 1),
            lt: new Date(y, m + 1, 1),
        };
    }

    const records = await prisma.attendanceRecord.findMany({
        where,
        include: { employee: { include: { department: true } } },
        orderBy: [{ date: 'desc' }, { employee: { name: 'asc' } }],
    });

    return NextResponse.json(records);
});

export const POST = withProtection(async (request, session, body) => {
    const companyId = (session.user as any).companyId;
    const { employeeId, date, checkIn, checkOut, status, notes } = body;

    if (!employeeId || !date || !status) {
        return NextResponse.json({ error: 'بيانات ناقصة: الموظف، التاريخ، والحالة مطلوبة' }, { status: 400 });
    }

    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);

    let checkInDate: Date | null = null;
    let checkOutDate: Date | null = null;
    if (checkIn) {
        checkInDate = new Date(date);
        const [h, m] = checkIn.split(':').map(Number);
        checkInDate.setHours(h, m, 0, 0);
    }
    if (checkOut) {
        checkOutDate = new Date(date);
        const [h, m] = checkOut.split(':').map(Number);
        checkOutDate.setHours(h, m, 0, 0);
    }

    // Calculate workHours
    let workHours = 0;
    if (checkInDate && checkOutDate) {
        workHours = diffHours(checkInDate, checkOutDate);
    }

    // Get employee's work schedule
    const employee = await prisma.employee.findFirst({
        where: { id: employeeId, companyId },
        include: { workSchedule: true },
    });

    let lateMinutes = 0;
    let overtimeHours = 0;

    if (employee?.workSchedule && checkInDate) {
        const scheduleCheckInMins = timeToMinutes(employee.workSchedule.checkInTime);
        const toleranceMins = employee.workSchedule.lateToleranceMinutes || 0;
        const actualCheckInMins = checkInDate.getHours() * 60 + checkInDate.getMinutes();
        const late = actualCheckInMins - scheduleCheckInMins - toleranceMins;
        lateMinutes = Math.max(0, late);
    }

    if (employee?.workSchedule && checkOutDate) {
        const scheduleCheckOutMins = timeToMinutes(employee.workSchedule.checkOutTime);
        const overtimeStartAfter = employee.workSchedule.overtimeStartAfter || 0;
        const actualCheckOutMins = checkOutDate.getHours() * 60 + checkOutDate.getMinutes();
        const overtimeMins = actualCheckOutMins - scheduleCheckOutMins - overtimeStartAfter;
        overtimeHours = Math.max(0, overtimeMins / 60);
    }

    const record = await prisma.attendanceRecord.upsert({
        where: { employeeId_date: { employeeId, date: dateObj } },
        create: {
            employeeId,
            date: dateObj,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            status,
            workHours,
            lateMinutes,
            overtimeHours,
            notes: notes || null,
            source: 'manual',
            companyId,
        },
        update: {
            checkIn: checkInDate,
            checkOut: checkOutDate,
            status,
            workHours,
            lateMinutes,
            overtimeHours,
            notes: notes || null,
        },
        include: { employee: true },
    });

    await logActivity({
        ...extractLogContext(session, request),
        action: 'create',
        module: 'attendance',
        entityType: 'AttendanceRecord',
        entityId: record.id,
        description: `تسجيل حضور للموظف ${employee?.name || employeeId} بتاريخ ${dateObj.toLocaleDateString('en-ZA')}`,
    });

    return NextResponse.json(record, { status: 201 });
});

export const PUT = withProtection(async (request, session, body) => {
    const companyId = (session.user as any).companyId;
    const { records } = body as { records: { id: string; status: string; notes?: string }[] };

    if (!records || !Array.isArray(records)) {
        return NextResponse.json({ error: 'مصفوفة السجلات مطلوبة' }, { status: 400 });
    }

    const updates = await Promise.all(
        records.map(({ id, status, notes }) =>
            prisma.attendanceRecord.updateMany({
                where: { id, companyId },
                data: { status, notes: notes || null },
            })
        )
    );

    return NextResponse.json({ updated: updates.length });
});
