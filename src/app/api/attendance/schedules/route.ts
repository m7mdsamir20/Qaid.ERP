import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity, extractLogContext } from '@/lib/activityLog';

export const GET = withProtection(async (request, session) => {
    const companyId = (session.user as any).companyId;

    const schedules = await prisma.workSchedule.findMany({
        where: { companyId },
        include: { _count: { select: { employees: true } } },
        orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(schedules);
});

export const POST = withProtection(async (request, session, body) => {
    const companyId = (session.user as any).companyId;
    const { name, checkInTime, checkOutTime, workDays, lateToleranceMinutes, overtimeStartAfter } = body;

    if (!name || !checkInTime || !checkOutTime) {
        return NextResponse.json({ error: 'الاسم ووقت الحضور والانصراف مطلوبة' }, { status: 400 });
    }

    const schedule = await prisma.workSchedule.create({
        data: {
            name,
            checkInTime,
            checkOutTime,
            workDays: JSON.stringify(workDays || ['Sun', 'Mon', 'Tue', 'Wed', 'Thu']),
            lateToleranceMinutes: Number(lateToleranceMinutes || 0),
            overtimeStartAfter: Number(overtimeStartAfter || 0),
            companyId,
        },
    });

    await logActivity({
        ...extractLogContext(session, request),
        action: 'create',
        module: 'attendance',
        entityType: 'WorkSchedule',
        entityId: schedule.id,
        description: `إنشاء جدول عمل: ${name}`,
    });

    return NextResponse.json(schedule, { status: 201 });
});

export const PUT = withProtection(async (request, session, body) => {
    const companyId = (session.user as any).companyId;
    const { id, name, checkInTime, checkOutTime, workDays, lateToleranceMinutes, overtimeStartAfter } = body;

    if (!id) {
        return NextResponse.json({ error: 'معرف الجدول مطلوب' }, { status: 400 });
    }

    const schedule = await prisma.workSchedule.updateMany({
        where: { id, companyId },
        data: {
            name,
            checkInTime,
            checkOutTime,
            workDays: JSON.stringify(workDays),
            lateToleranceMinutes: Number(lateToleranceMinutes || 0),
            overtimeStartAfter: Number(overtimeStartAfter || 0),
        },
    });

    return NextResponse.json(schedule);
});

export const DELETE = withProtection(async (request, session) => {
    const companyId = (session.user as any).companyId;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'معرف الجدول مطلوب' }, { status: 400 });
    }

    // Check if used by employees
    const empCount = await prisma.employee.count({ where: { workScheduleId: id, companyId } });
    if (empCount > 0) {
        return NextResponse.json({ error: `لا يمكن حذف الجدول، ${empCount} موظف مرتبط به` }, { status: 400 });
    }

    await prisma.workSchedule.deleteMany({ where: { id, companyId } });

    return NextResponse.json({ success: true });
});
