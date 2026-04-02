import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { getBranchFilter } from '@/lib/apiAuth';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const branchFilter = getBranchFilter(session);

        const payrolls = await prisma.payroll.findMany({
            where: { companyId, ...branchFilter },
            include: {
                _count: { select: { lines: true } }
            },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
        });

        return NextResponse.json(payrolls);
    } catch {
        return NextResponse.json([], { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const activeBranchId = (session.user as any).activeBranchId;
        const { month, year, date, departmentId } = body;

        if (!month || !year || !date) {
            return NextResponse.json({ error: "بيانات التاريخ مطلوبة" }, { status: 400 });
        }

        const exists = await prisma.payroll.findFirst({
            where: { companyId, month: Number(month), year: Number(year) }
        });
        if (exists) {
            return NextResponse.json({ 
                error: "تم إصدار مسير رواتب لهذا الشهر مسبقاً" 
            }, { status: 400 });
        }

        const employeeQuery: any = { companyId, status: 'active' };
        if (departmentId) employeeQuery.departmentId = departmentId;

        // Using raw query to bypass "Unknown field 'payrolls'" issue in Prisma client
        let employees: any[];
        if (departmentId) {
            employees = await prisma.$queryRaw`
                SELECT id, code, name, basicSalary, housingAllowance, transportAllowance, 
                       foodAllowance, insuranceDeduction, taxDeduction, departmentId, companyId 
                FROM Employee 
                WHERE companyId = ${companyId} AND status = 'active' AND departmentId = ${departmentId}
            `;
        } else {
            employees = await prisma.$queryRaw`
                SELECT id, code, name, basicSalary, housingAllowance, transportAllowance, 
                       foodAllowance, insuranceDeduction, taxDeduction, departmentId, companyId 
                FROM Employee 
                WHERE companyId = ${companyId} AND status = 'active'
            `;
        }

        if (employees.length === 0) {
            return NextResponse.json({ 
                error: "لا يوجد موظفين نشطين لإصدار الراتب" 
            }, { status: 400 });
        }

        const employeeIds = employees.map(e => e.id);

        // Fetch related data separately to avoid "Unknown field 'payrolls'" errors in some local prisma client versions
        const [allAdvances, allDeductions, allPrevLines] = await Promise.all([
            prisma.advance.findMany({
                where: { employeeId: { in: employeeIds }, companyId, status: 'deducted' },
                orderBy: { date: 'asc' }
            }),
            prisma.deduction.findMany({
                where: { employeeId: { in: employeeIds }, companyId, status: 'deducted' },
                orderBy: { date: 'asc' }
            }),
            prisma.payrollLine.findMany({
                where: { employeeId: { in: employeeIds }, payroll: { companyId, status: 'paid' } },
                include: { payroll: true }
            })
        ]);

        // Map data to employees
        const employeesWithData = employees.map(emp => ({
            ...emp,
            advances: allAdvances.filter((a: any) => a.employeeId === emp.id),
            deductions: allDeductions.filter((d: any) => d.employeeId === emp.id),
            payrolls: allPrevLines.filter((pl: any) => pl.employeeId === emp.id)
        }));

        let [totalSalaries, totalAllowances, totalAdvances, totalDiscounts, totalNet] = [0, 0, 0, 0, 0];

        const linesData = employeesWithData.map(emp => {
            const basic      = Number(emp.basicSalary) || 0;
            const allowances = (Number(emp.housingAllowance)   || 0)
                             + (Number(emp.transportAllowance) || 0)
                             + (Number(emp.foodAllowance)      || 0);
            const statutory  = (Number(emp.insuranceDeduction) || 0)
                             + (Number(emp.taxDeduction)        || 0);

            // --- منطق FIFO للسلف ---
            const totalRecoveredAdvances = (emp.payrolls || []).reduce((sum: number, p: any) => sum + (Number(p.advances) || 0), 0);
            let remainingRecoveryPool = totalRecoveredAdvances;
            
            let currentMonthAdvanceDeduction = 0;

            for (const adv of (emp.advances || [])) {
                const advAmount = Number(adv.amount) || 0;
                const paidOffFromThis = Math.min(advAmount, remainingRecoveryPool);
                remainingRecoveryPool -= paidOffFromThis;

                const outstandingOnThis = advAmount - paidOffFromThis;
                
                if (outstandingOnThis > 0) {
                    const installment = Number(adv.monthlyAmount) > 0 ? Number(adv.monthlyAmount) : advAmount;
                    currentMonthAdvanceDeduction += Math.min(installment, outstandingOnThis);
                }
            }

            // --- منطق FIFO للخصومات ---
            // نستبعد مبالغ التأمينات والضرائب من إجمالي الخصومات المسجلة سابقاً للوصول لصافي الجزاءات
            const totalRecoveredDeductions = (emp.payrolls || []).reduce((sum: number, p: any) => {
                return sum + (Number(p.discounts) || 0);
            }, 0);
            
            let remainingDeductionPool = totalRecoveredDeductions;
            let currentMonthOtherDeductions = 0;

            for (const ded of (emp.deductions || [])) {
                const dedAmount = Number(ded.amount) || 0;
                const paidOffFromThis = Math.min(dedAmount, remainingDeductionPool);
                remainingDeductionPool -= paidOffFromThis;

                const outstandingOnThis = dedAmount - paidOffFromThis;
                if (outstandingOnThis > 0) {
                    currentMonthOtherDeductions += outstandingOnThis;
                }
            }

            const totalEmpDiscounts = currentMonthOtherDeductions + statutory;
            const gross    = basic + allowances;
            const netSalary = gross - totalEmpDiscounts - currentMonthAdvanceDeduction;

            totalSalaries   += basic;
            totalAllowances += allowances;
            totalAdvances   += currentMonthAdvanceDeduction;
            totalDiscounts  += totalEmpDiscounts;
            totalNet        += netSalary;

            return {
                employeeId:  emp.id,
                basicSalary: basic,
                allowances,
                advances:    currentMonthAdvanceDeduction,
                discounts:   totalEmpDiscounts,
                netSalary,
            };
        });

        const result = await prisma.$transaction(async (tx) => {
            const payroll = await (tx as any).payroll.create({
                data: {
                    companyId,
                    branchId: activeBranchId && activeBranchId !== 'all' ? activeBranchId : null,
                    month:          Number(month),
                    year:           Number(year),
                    date:           new Date(date),
                    status:         'draft',
                    totalSalaries,
                    totalAllowances,
                    totalAdvances,
                    totalDiscounts,
                    netTotal: totalNet,
                    lines: { create: linesData }
                }
            });
            return payroll;
        });

        return NextResponse.json(result, { status: 201 });
    } catch (e: any) {
        console.error("Payroll Generation Error:", e);
        return NextResponse.json({ error: "حدث خطأ أثناء إصدار المسير: " + (e.message || "Unknown error") }, { status: 500 });
    }

});
