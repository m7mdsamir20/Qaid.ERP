import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    const companyId = (session.user as any).companyId;
    const { searchParams } = new URL(request.url);

    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const departmentId = searchParams.get('departmentId');
    const branchId = searchParams.get('branchId');

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // last day of month

    // Get all employees
    const employeeWhere: any = { companyId, status: 'active' };
    if (departmentId && departmentId !== 'all') employeeWhere.departmentId = departmentId;
    if (branchId && branchId !== 'all') employeeWhere.branchId = branchId;

    const employees = await prisma.employee.findMany({
        where: employeeWhere,
        include: { department: true },
        orderBy: { name: 'asc' },
    });

    // Get all attendance records for the month
    const records = await prisma.attendanceRecord.findMany({
        where: {
            companyId,
            date: { gte: startDate, lte: endDate },
        },
        orderBy: { date: 'asc' },
    });

    // Get official holidays for the month
    const holidays = await prisma.officialHoliday.findMany({
        where: {
            companyId,
            date: { gte: startDate, lte: endDate },
        },
    });
    const holidayDates = new Set(
        holidays.map(h => h.date.toISOString().split('T')[0])
    );

    // Map records by employeeId + date key
    const recordMap = new Map<string, any>();
    for (const r of records) {
        const key = `${r.employeeId}_${r.date.toISOString().split('T')[0]}`;
        recordMap.set(key, r);
    }

    // Build days array
    const daysInMonth = endDate.getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => {
        const d = new Date(year, month - 1, i + 1);
        return d.toISOString().split('T')[0];
    });

    // Build per-employee data
    const employeesData = employees.map(emp => {
        const empRecords = daysArray.map(dateStr => {
            const key = `${emp.id}_${dateStr}`;
            const record = recordMap.get(key);
            const isHoliday = holidayDates.has(dateStr);

            if (record) {
                return {
                    date: dateStr,
                    status: record.status,
                    checkIn: record.checkIn ? record.checkIn.toISOString() : null,
                    checkOut: record.checkOut ? record.checkOut.toISOString() : null,
                    workHours: record.workHours,
                    lateMinutes: record.lateMinutes,
                    overtimeHours: record.overtimeHours,
                    recordId: record.id,
                };
            }

            return {
                date: dateStr,
                status: isHoliday ? 'holiday' : null,
                checkIn: null,
                checkOut: null,
                workHours: 0,
                lateMinutes: 0,
                overtimeHours: 0,
                recordId: null,
            };
        });

        const summary = {
            present: empRecords.filter(r => r.status === 'present').length,
            absent: empRecords.filter(r => r.status === 'absent').length,
            late: empRecords.filter(r => r.status === 'late').length,
            leaves: empRecords.filter(r => r.status === 'on_leave').length,
            holidays: empRecords.filter(r => r.status === 'holiday').length,
            overtime: empRecords.reduce((acc, r) => acc + (r.overtimeHours || 0), 0),
            totalWorkHours: empRecords.reduce((acc, r) => acc + (r.workHours || 0), 0),
            totalLateMinutes: empRecords.reduce((acc, r) => acc + (r.lateMinutes || 0), 0),
        };

        return {
            id: emp.id,
            name: emp.name,
            code: emp.code,
            department: emp.department?.name || null,
            records: empRecords,
            summary,
        };
    });

    return NextResponse.json({
        month,
        year,
        days: daysArray,
        employees: employeesData,
    });
});
