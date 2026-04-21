import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session, body, context) => {
    try {
        const { id } = await context.params;
        const companyId = (session.user as any).companyId;

        const payroll = await prisma.payroll.findUnique({
            where: { id: id, companyId },
            include: {
                lines: {
                    include: { employee: true }
                }
            }
        });

        if (!payroll) return NextResponse.json({ error: "Not found" }, { status: 404 });

        return NextResponse.json(payroll);
    } catch {
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body, context) => {
    try {
        const { id: payrollId } = await context.params;
        const companyId = (session.user as any).companyId;
        const { action } = body;

        const payroll = await prisma.payroll.findUnique({
            where: { id: payrollId, companyId },
            include: { lines: { include: { employee: true } } }
        });

        if (!payroll) return NextResponse.json({ error: "المسير غير موجود" }, { status: 404 });
        if (payroll.status === 'paid') return NextResponse.json({ error: "المسير معتمد ومصروف مسبقاً" }, { status: 400 });

        if (action === 'sync') {
            // منطق إعادة المزامنة — جلب السلف والخصومات الجديدة وتحديث السطور
            const employeeIds = payroll.lines.map((l: any) => l.employeeId);
            
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

            let [totalSalaries, totalAllowances, totalAdvances, totalDiscounts, totalNet] = [0, 0, 0, 0, 0];

            const updatedLinesRaw = payroll.lines.map((pLine: any) => {
                const emp = pLine.employee;
                const basic = Number(emp.basicSalary) || 0;
                const allowances = (Number(emp.housingAllowance) || 0) + (Number(emp.transportAllowance) || 0) + (Number(emp.foodAllowance) || 0);
                const statutory = (Number(emp.insuranceDeduction) || 0) + (Number(emp.taxDeduction) || 0);

                const empAdvances = allAdvances.filter((a: any) => a.employeeId === emp.id);
                const empDeductions = allDeductions.filter((d: any) => d.employeeId === emp.id);
                const empPastPayrolls = allPrevLines.filter((pl: any) => pl.employeeId === emp.id);

                // FIFO Advances
                const totalRecoveredAdvances = empPastPayrolls.reduce((sum: number, p: any) => sum + (Number(p.advances) || 0), 0);
                let remainingRecoveryPool = totalRecoveredAdvances;
                let currentMonthAdvanceDeduction = 0;
                for (const adv of empAdvances) {
                    const advAmt = Number(adv.amount) || 0;
                    const paidOff = Math.min(advAmt, remainingRecoveryPool);
                    remainingRecoveryPool -= paidOff;
                    const outstanding = advAmt - paidOff;
                    if (outstanding > 0) {
                        const installment = Number(adv.monthlyAmount) > 0 ? Number(adv.monthlyAmount) : advAmt;
                        currentMonthAdvanceDeduction += Math.min(installment, outstanding);
                    }
                }

                // FIFO Deductions
                const totalRecoveredDeductions = empPastPayrolls.reduce((sum: number, p: any) => sum + (Number(p.discounts) || 0), 0);
                let remainingDeductionPool = totalRecoveredDeductions;
                let currentMonthOtherDeductions = 0;
                for (const ded of empDeductions) {
                    const dedAmt = Number(ded.amount) || 0;
                    const paidOff = Math.min(dedAmt, remainingDeductionPool);
                    remainingDeductionPool -= paidOff;
                    const outstanding = dedAmt - paidOff;
                    if (outstanding > 0) {
                        currentMonthOtherDeductions += outstanding;
                    }
                }

                const totalEmpDiscounts = currentMonthOtherDeductions + statutory;
                const netSalary = (basic + allowances) - totalEmpDiscounts - currentMonthAdvanceDeduction;

                totalSalaries += basic;
                totalAllowances += allowances;
                totalAdvances += currentMonthAdvanceDeduction;
                totalDiscounts += totalEmpDiscounts;
                totalNet += netSalary;

                return { id: pLine.id, advances: currentMonthAdvanceDeduction, discounts: totalEmpDiscounts, netSalary };
            });

            await prisma.$transaction(async (tx) => {
                for (const line of updatedLinesRaw) {
                    await tx.payrollLine.update({
                        where: { id: line.id },
                        data: { advances: line.advances, discounts: line.discounts, netSalary: line.netSalary }
                    });
                }
                await tx.payroll.update({
                    where: { id: payrollId },
                    data: { totalAdvances, totalDiscounts, netTotal: totalNet }
                });
            });

            return NextResponse.json({ success: true });
        }

        if (action === 'approve') {
            const { treasuryId } = body;
            if (!treasuryId) return NextResponse.json({ 
                error: "اختر خزينة الصرف" 
            }, { status: 400 });

            const activeYear = await prisma.financialYear.findFirst({
                where: { companyId, isOpen: true },
                orderBy: { startDate: 'desc' }
            });
            if (!activeYear) return NextResponse.json({ 
                error: "لا توجد سنة مالية مفعلة" 
            }, { status: 400 });

            const treasury = await prisma.treasury.findUnique({
                where: { id: treasuryId, companyId }
            });
            if (!treasury) return NextResponse.json({ 
                error: "الخزينة غير موجودة" 
            }, { status: 400 });
            if (treasury.balance < payroll.netTotal) return NextResponse.json({ 
                error: `رصيد الخزينة غير كافٍ. المتاح: ${treasury.balance.toLocaleString()}` 
            }, { status: 400 });

            // جيب الحسابات المطلوبة
            const employeeIds = payroll.lines.map((l: any) => l.employeeId);

            // جيب الخصومات المسجلة مسبقاً (لها journalEntryId) للموظفين في هذا المسير
            const prePostedDeductions = await prisma.deduction.findMany({
                where: {
                    companyId,
                    employeeId: { in: employeeIds },
                    status: 'deducted',
                    journalEntryId: { not: null }
                }
            });
            const prePostedTotal = prePostedDeductions.reduce((sum, d) => sum + d.amount, 0);

            const [salaryExpenseAcc, advanceAcc, deductionAcc, employeeReceivableAcc, cashAcc] = await Promise.all([
                // مصروف رواتب
                prisma.account.findFirst({
                    where: { companyId, OR: [
                        { code: '5210' },
                        { name: { contains: 'رواتب والأجور' }, type: 'expense' },
                        { name: { contains: 'الرواتب' }, type: 'expense' },
                    ]}
                }),
                // سلف الموظفين
                prisma.account.findFirst({
                    where: { companyId, OR: [
                        { code: '1126' },
                        { name: { contains: 'سلف' }, type: 'asset' },
                        { name: { contains: 'سلفيات' }, type: 'asset' },
                    ]}
                }),
                // إيرادات الخصومات (للخصومات الجديدة غير المسجلة)
                prisma.account.findFirst({
                    where: { companyId, OR: [
                        { name: { contains: 'جزاءات' }, type: 'revenue' },
                        { name: { contains: 'غرامات' }, type: 'revenue' },
                        { name: { contains: 'إيرادات متنوعة' }, type: 'revenue' },
                    ]}
                }),
                // سلف الموظفين (1143) — نفس الحساب المستخدم في قيد الخصم
                prisma.account.findFirst({
                    where: { companyId, OR: [
                        { code: '1143' },
                        { type: 'asset', name: { contains: 'سلف الموظفين' } },
                        { type: 'asset', name: { contains: 'ذمم الموظفين' } },
                        { type: 'asset', name: { contains: 'مدينون متنوعون' } },
                    ]}
                }),
                // حساب الخزينة
                treasury.accountId
                    ? prisma.account.findUnique({ where: { id: treasury.accountId } })
                    : prisma.account.findFirst({
                        where: { companyId, type: 'asset', accountCategory: 'detail',
                            OR: [{ name: { contains: 'صندوق' } }, { name: { contains: 'بنك' } }]
                        }
                    }),
            ]);

            if (!salaryExpenseAcc || !cashAcc) {
                return NextResponse.json({
                    error: "لم يتم العثور على الحسابات المحاسبية المطلوبة (حساب الرواتب أو حساب الخزينة)"
                }, { status: 400 });
            }

            // تحقق إضافي: لو في سلف ومفيش حساب سلف → القيد سيكون غير متوازن
            if (payroll.totalAdvances > 0 && !advanceAcc) {
                return NextResponse.json({
                    error: "يوجد استقطاع سلف في المسير ولكن لا يوجد حساب (سلف الموظفين) في دليل الحسابات"
                }, { status: 400 });
            }

            // تحقق: لو في خصومات جديدة ومفيش حساب إيراد خصومات → القيد سيكون غير متوازن
            const newDeductionsCheck = payroll.totalDiscounts - prePostedTotal;
            if (newDeductionsCheck > 0 && !deductionAcc) {
                return NextResponse.json({
                    error: "يوجد خصومات في المسير ولكن لا يوجد حساب (إيرادات الجزاءات/الغرامات) في دليل الحسابات"
                }, { status: 400 });
            }

            // تحقق: لو في خصومات مسجلة مسبقاً ومفيش حساب ذمم موظفين → القيد سيكون غير متوازن
            if (prePostedTotal > 0 && !employeeReceivableAcc) {
                return NextResponse.json({
                    error: "يوجد خصومات مسجلة مسبقاً ولكن لا يوجد حساب (ذمم الموظفين / سلف الموظفين) في دليل الحسابات"
                }, { status: 400 });
            }

            const result = await prisma.$transaction(async (tx) => {
                // ① عدّل حالة المسير
                const updated = await tx.payroll.update({
                    where: { id: payrollId },
                    data: { status: 'paid' }
                });

                // ② ابني سطور القيد
                const journalLines: any[] = [];

                // مدين: مصروف رواتب (إجمالي الأساسي + البدلات)
                const grossTotal = payroll.totalSalaries + payroll.totalAllowances;
                journalLines.push({
                    accountId:   salaryExpenseAcc.id,
                    debit:       grossTotal,
                    credit:      0,
                    description: `إجمالي رواتب شهر ${payroll.month}/${payroll.year}`,
                });

                // دائن: سلف الموظفين (لإغلاق حساب السلف)
                if (payroll.totalAdvances > 0 && advanceAcc) {
                    journalLines.push({
                        accountId:   advanceAcc.id,
                        debit:       0,
                        credit:      payroll.totalAdvances,
                        description: 'خصم السلف من الرواتب',
                    });
                }

                // دائن: ذمم الموظفين — تسوية الخصومات المسجلة مسبقاً
                if (prePostedTotal > 0 && employeeReceivableAcc) {
                    journalLines.push({
                        accountId:   employeeReceivableAcc.id,
                        debit:       0,
                        credit:      prePostedTotal,
                        description: 'تسوية خصومات موظفين مسجلة مسبقاً',
                    });
                }

                // دائن: إيراد خصومات — للخصومات الجديدة (غير المسجلة) + الاستقطاعات الإلزامية
                const newDeductionsTotal = payroll.totalDiscounts - prePostedTotal;
                if (newDeductionsTotal > 0 && deductionAcc) {
                    journalLines.push({
                        accountId:   deductionAcc.id,
                        debit:       0,
                        credit:      newDeductionsTotal,
                        description: 'خصومات وجزاءات واستقطاعات إلزامية',
                    });
                }

                // دائن: خزينة (الصافي المدفوع فقط)
                journalLines.push({
                    accountId:   cashAcc.id,
                    debit:       0,
                    credit:      payroll.netTotal,
                    description: 'صرف الرواتب للموظفين',
                });

                // ③ سجّل القيد
                const lastEntry = await tx.journalEntry.findFirst({
                    where: { companyId },
                    orderBy: { entryNumber: 'desc' },
                    select: { entryNumber: true }
                });

                await tx.journalEntry.create({
                    data: {
                        entryNumber:     (lastEntry?.entryNumber || 0) + 1,
                        date:            new Date(),
                        description:     `صرف رواتب شهر ${payroll.month}/${payroll.year}`,
                        referenceType:   'payroll',
                        referenceId:     payroll.id,
                        financialYearId: activeYear.id,
                        companyId,
                        isPosted:        true,
                        lines: { create: journalLines }
                    }
                });

                // ④ انقص الخزينة
                await tx.treasury.update({
                    where: { id: treasuryId },
                    data: { balance: { decrement: payroll.netTotal } }
                });

                // ⑤ سجّل سند صرف
                const lastVoucher = await tx.voucher.findFirst({
                    where: { companyId },
                    orderBy: { voucherNumber: 'desc' },
                    select: { voucherNumber: true }
                });

                await tx.voucher.create({
                    data: {
                        voucherNumber:   (lastVoucher?.voucherNumber || 0) + 1,
                        type:            'payment',
                        date:            new Date(),
                        amount:          payroll.netTotal,
                        description:     `رواتب شهر ${payroll.month}/${payroll.year}`,
                        treasuryId:      treasury.id,
                        accountId:       salaryExpenseAcc.id,
                        financialYearId: activeYear.id,
                        companyId,
                    }
                });

                // ⑥ Update Advances & Deductions status for employees in this payroll
                const employeesInPayroll = payroll.lines.map(l => l.employeeId);
                await tx.advance.updateMany({
                    where: {
                        employeeId: { in: employeesInPayroll },
                        companyId,
                        status: 'deducted'
                    },
                    data: { status: 'settled' }
                });

                await tx.deduction.updateMany({
                    where: {
                        employeeId: { in: employeesInPayroll },
                        companyId,
                        status: 'deducted'
                    },
                    data: { status: 'settled' }
                });

                return updated;
            });

            return NextResponse.json(result);
        }

        return NextResponse.json({ error: "إجراء غير صالح" }, { status: 400 });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message || "فشل في اعتماد المسير" }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session, body, context) => {
    try {
        const { id } = await context.params;
        const companyId = (session.user as any).companyId;

        const payroll = await prisma.payroll.findUnique({
            where: { id, companyId },
            include: { lines: { select: { id: true } } }
        });

        if (!payroll) return NextResponse.json({ error: "المسير غير موجود" }, { status: 404 });
        if (payroll.status === 'paid') return NextResponse.json({ error: "لا يمكن حذف مسير معتمد — استخدم الإلغاء" }, { status: 400 });

        await prisma.$transaction(async (tx) => {
            // حذف أي قيود يومية مرتبطة بالمسير (احتياط)
            await tx.journalEntry.deleteMany({
                where: { companyId, referenceType: 'payroll', referenceId: id }
            });

            // حذف بنود المسير
            await tx.payrollLine.deleteMany({ where: { payrollId: id } });

            // حذف المسير
            await tx.payroll.delete({ where: { id, companyId } });
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "فشل حذف المسير" }, { status: 500 });
    }
});
