/**
 * HR REPORTS API HANDLER
 * =======================
 * DO NOT CHANGE THE AUTH-OPTIONS IMPORT BELOW.
 * IT MUST POINT TO '@/lib/auth' ALWAYS.
 * VERSION: 1.0.1 (FRESH REBUILD)
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
    // Session authorization check
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

                const lines = await prisma.payrollLine.findMany({
                    where: { payroll: { companyId, month, year } },
                    include: { employee: true }
                });

                const summary = await prisma.payroll.findFirst({
                    where: { companyId, month, year },
                    select: { totalSalaries: true, totalAllowances: true, totalDiscounts: true, netTotal: true }
                });

                return NextResponse.json({
                    records: lines.map(l => ({
                        id: l.id,
                        employeeName: l.employee.name,
                        basicSalary: l.basicSalary,
                        allowances: l.allowances,
                        deductions: l.discounts + l.advances,
                        netSalary: l.netSalary
                    })),
                    summary: summary || { totalSalaries: 0, totalAllowances: 0, totalDiscounts: 0, netTotal: 0 }
                });
            }

            case 'advances': {
                const employeesWithAdvances = await prisma.employee.findMany({
                    where: { companyId },
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
                const deductions = await prisma.deduction.findMany({
                    where: { companyId },
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
                const employees = await prisma.employee.findMany({
                    where: { companyId },
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

            default:
                return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
        }
    } catch (error) {
        console.error('HR report error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
