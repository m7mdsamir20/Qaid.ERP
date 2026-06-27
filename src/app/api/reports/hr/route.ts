/**
 * HR REPORTS API HANDLER
 * =======================
 * DO NOT CHANGE THE AUTH-OPTIONS IMPORT BELOW.
 * IT MUST POINT TO '@/lib/auth' ALWAYS.
 * VERSION: 1.0.2 (HR & ATTENDANCE REBUILD)
 */
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

interface AdvanceRecord {
    id: string;
    employeeName: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    status: 'paid' | 'partial' | 'active';
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const companyId = session.user.companyId;
    if (!companyId) return NextResponse.json({ error: 'Company context is required' }, { status: 400 });
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    try {
        switch (type) {
            case 'payroll-statement': {
                const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
                const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
                const urlBranchId = searchParams.get('branchId');

                const lineFilter: any = { payroll: { companyId, month, year } };
                if (urlBranchId && urlBranchId !== 'all') {
                    lineFilter.employee = { branchId: urlBranchId };
                }

                const lines = await prisma.payrollLine.findMany({
                    where: lineFilter,
                    include: { employee: true }
                });

                const totalSalaries = lines.reduce((s, l) => s + l.basicSalary, 0);
                const totalAllowances = lines.reduce((s, l) => s + l.allowances, 0);
                const totalDiscounts = lines.reduce((s, l) => s + l.discounts + l.advances, 0);
                const netTotal = lines.reduce((s, l) => s + l.netSalary, 0);

                return NextResponse.json({
                    records: lines.map(l => ({
                        id: l.id,
                        employeeName: l.employee.name,
                        basicSalary: l.basicSalary,
                        allowances: l.allowances,
                        deductions: l.discounts + l.advances,
                        netSalary: l.netSalary
                    })),
                    summary: {
                        totalSalaries,
                        totalAllowances,
                        totalDiscounts,
                        netTotal
                    }
                });
            }

            case 'advances': {
                const urlBranchId = searchParams.get('branchId');
                const empFilter: any = { companyId };
                if (urlBranchId && urlBranchId !== 'all') {
                    empFilter.branchId = urlBranchId;
                }

                const employeesWithAdvances = await prisma.employee.findMany({
                    where: empFilter,
                    include: {
                        advances: true,
                        payrolls: { select: { advances: true } }
                    }
                });

                const records = employeesWithAdvances
                    .map<AdvanceRecord | null>(emp => {
                        const totalAdvances = emp.advances.reduce((sum, a) => sum + a.amount, 0);
                        const paidAmount = emp.payrolls.reduce((sum, p) => sum + p.advances, 0);
                        const remaining = totalAdvances - paidAmount;
                        
                        if (totalAdvances === 0) return null;

                        return {
                            id: emp.id,
                            employeeName: emp.name,
                            totalAmount: totalAdvances,
                            paidAmount,
                            remainingAmount: remaining,
                            status: remaining <= 0 ? 'paid' : (paidAmount > 0 ? 'partial' : 'active')
                        };
                    })
                    .filter((record): record is AdvanceRecord => record !== null);

                return NextResponse.json({
                    records,
                    totalAdvances: records.reduce((sum, r) => sum + r.totalAmount, 0),
                    totalRecovered: records.reduce((sum, r) => sum + r.paidAmount, 0),
                    totalOutstanding: records.reduce((sum, r) => sum + r.remainingAmount, 0)
                });
            }

            case 'deductions': {
                const urlBranchId = searchParams.get('branchId');
                const dedFilter: any = { companyId };
                if (urlBranchId && urlBranchId !== 'all') {
                    dedFilter.employee = { branchId: urlBranchId };
                }

                const deductions = await prisma.deduction.findMany({
                    where: dedFilter,
                    include: { employee: true },
                    orderBy: { date: 'desc' }
                });

                const records = deductions.map(d => ({
                    id: d.id,
                    employeeName: d.employee.name,
                    type: d.reason?.includes('غياب') ? 'absence' : (d.reason?.includes('تأخير') ? 'late' : 'penalty'),
                    amount: d.amount,
                    reason: d.reason || 'خصم إداري',
                    date: d.date.toISOString().split('T')[0]
                }));

                return NextResponse.json({
                    records,
                    totalAmount: records.reduce((sum, r) => sum + r.amount, 0),
                    totalCount: records.length
                });
            }

            case 'catalog': {
                const urlBranchId = searchParams.get('branchId');
                const empFilter: any = { companyId };
                if (urlBranchId && urlBranchId !== 'all') {
                    empFilter.branchId = urlBranchId;
                }

                const employees = await prisma.employee.findMany({
                    where: empFilter,
                    include: { department: true },
                    orderBy: { name: 'asc' }
                });

                return NextResponse.json(employees.map(e => ({
                    id: e.code,
                    name: e.name,
                    department: e.department?.name || 'بدون قسم',
                    position: e.position || 'غير محدد',
                    joinDate: e.hireDate.toISOString().split('T')[0],
                    phone: e.phone || '-',
                    status: e.status === 'active' ? 'active' : 'inactive'
                })));
            }

            case 'attendance-monthly': {
                const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
                const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
                const urlBranchId = searchParams.get('branchId');

                const empFilter: any = { companyId };
                if (urlBranchId && urlBranchId !== 'all') {
                    empFilter.branchId = urlBranchId;
                }

                const employees = await prisma.employee.findMany({
                    where: empFilter,
                    include: {
                        department: true,
                        attendanceRecords: {
                            where: {
                                date: {
                                    gte: new Date(year, month - 1, 1),
                                    lt: new Date(year, month, 1)
                                }
                            }
                        }
                    }
                });

                const records = employees.map(emp => {
                    const present = emp.attendanceRecords.filter(r => r.status === 'present').length;
                    const absent = emp.attendanceRecords.filter(r => r.status === 'absent').length;
                    const late = emp.attendanceRecords.filter(r => r.status === 'late' || (r.lateMinutes && r.lateMinutes > 0)).length;
                    const leave = emp.attendanceRecords.filter(r => r.status === 'leave').length;

                    return {
                        id: emp.id,
                        employeeName: emp.name,
                        department: emp.department?.name || '—',
                        position: emp.position || '—',
                        present,
                        absent,
                        late,
                        leave,
                    };
                });

                return NextResponse.json({ records });
            }

            case 'attendance-late': {
                const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
                const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
                const urlBranchId = searchParams.get('branchId');

                const empFilter: any = { companyId };
                if (urlBranchId && urlBranchId !== 'all') {
                    empFilter.branchId = urlBranchId;
                }

                const employees = await prisma.employee.findMany({
                    where: empFilter,
                    include: {
                        department: true,
                        attendanceRecords: {
                            where: {
                                date: {
                                    gte: new Date(year, month - 1, 1),
                                    lt: new Date(year, month, 1)
                                },
                                lateMinutes: { gt: 0 }
                            }
                        }
                    }
                });

                const records = employees.map(emp => {
                    const totalLateMinutes = emp.attendanceRecords.reduce((sum, r) => sum + (r.lateMinutes || 0), 0);
                    const lateDaysCount = emp.attendanceRecords.length;

                    return {
                        id: emp.id,
                        employeeName: emp.name,
                        department: emp.department?.name || '—',
                        position: emp.position || '—',
                        lateDaysCount,
                        totalLateMinutes
                    };
                }).filter(r => r.lateDaysCount > 0);

                return NextResponse.json({ records });
            }

            case 'attendance-absence': {
                const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
                const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
                const urlBranchId = searchParams.get('branchId');

                const empFilter: any = { companyId };
                if (urlBranchId && urlBranchId !== 'all') {
                    empFilter.branchId = urlBranchId;
                }

                const employees = await prisma.employee.findMany({
                    where: empFilter,
                    include: {
                        department: true,
                        attendanceRecords: {
                            where: {
                                date: {
                                    gte: new Date(year, month - 1, 1),
                                    lt: new Date(year, month, 1)
                                },
                                status: 'absent'
                            }
                        }
                    }
                });

                const records = employees.map(emp => {
                    const absenceCount = emp.attendanceRecords.length;

                    return {
                        id: emp.id,
                        employeeName: emp.name,
                        department: emp.department?.name || '—',
                        position: emp.position || '—',
                        absenceCount
                    };
                }).filter(r => r.absenceCount > 0);

                return NextResponse.json({ records });
            }

            case 'attendance-overtime': {
                const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
                const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
                const urlBranchId = searchParams.get('branchId');

                const empFilter: any = { companyId };
                if (urlBranchId && urlBranchId !== 'all') {
                    empFilter.branchId = urlBranchId;
                }

                const employees = await prisma.employee.findMany({
                    where: empFilter,
                    include: {
                        department: true,
                        attendanceRecords: {
                            where: {
                                date: {
                                    gte: new Date(year, month - 1, 1),
                                    lt: new Date(year, month, 1)
                                },
                                overtimeHours: { gt: 0 }
                            }
                        }
                    }
                });

                const records = employees.map(emp => {
                    const totalOvertimeHours = emp.attendanceRecords.reduce((sum, r) => sum + (r.overtimeHours || 0), 0);
                    const overtimeDaysCount = emp.attendanceRecords.length;

                    return {
                        id: emp.id,
                        employeeName: emp.name,
                        department: emp.department?.name || '—',
                        position: emp.position || '—',
                        overtimeDaysCount,
                        totalOvertimeHours
                    };
                }).filter(r => r.overtimeDaysCount > 0);

                return NextResponse.json({ records });
            }

            case 'leave-balance': {
                const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
                const urlBranchId = searchParams.get('branchId');

                const empFilter: any = { companyId };
                if (urlBranchId && urlBranchId !== 'all') {
                    empFilter.branchId = urlBranchId;
                }

                const leaveBalances = await prisma.leaveBalance.findMany({
                    where: {
                        companyId,
                        year,
                        employee: empFilter
                    },
                    include: {
                        employee: {
                            include: { department: true }
                        }
                    }
                });

                const records = leaveBalances.map(lb => ({
                    id: lb.id,
                    employeeName: lb.employee.name,
                    department: lb.employee.department?.name || '—',
                    position: lb.employee.position || '—',
                    type: lb.type,
                    entitled: lb.entitled,
                    used: lb.used,
                    remaining: lb.remaining
                }));

                return NextResponse.json({ records });
            }

            default:
                return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
        }
    } catch (error) {
        console.error('HR report error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
