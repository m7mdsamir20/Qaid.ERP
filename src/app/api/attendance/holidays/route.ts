import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity, extractLogContext } from '@/lib/activityLog';

export const GET = withProtection(async (request, session) => {
    const companyId = (session.user as any).companyId;

    const holidays = await prisma.officialHoliday.findMany({
        where: { companyId },
        orderBy: { date: 'asc' },
    });

    return NextResponse.json(holidays);
});

export const POST = withProtection(async (request, session, body) => {
    const companyId = (session.user as any).companyId;
    const { name, date, isRecurring } = body;

    if (!name || !date) {
        return NextResponse.json({ error: 'اسم العطلة والتاريخ مطلوبان' }, { status: 400 });
    }

    const holiday = await prisma.officialHoliday.create({
        data: {
            name,
            date: new Date(date),
            isRecurring: !!isRecurring,
            companyId,
        },
    });

    await logActivity({
        ...extractLogContext(session, request),
        action: 'create',
        module: 'attendance',
        entityType: 'OfficialHoliday',
        entityId: holiday.id,
        description: `إضافة عطلة رسمية: ${name}`,
    });

    return NextResponse.json(holiday, { status: 201 });
});

export const DELETE = withProtection(async (request, session) => {
    const companyId = (session.user as any).companyId;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'معرف العطلة مطلوب' }, { status: 400 });
    }

    await prisma.officialHoliday.deleteMany({ where: { id, companyId } });

    return NextResponse.json({ success: true });
});
