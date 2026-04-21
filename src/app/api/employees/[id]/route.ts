import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session, body, context) => {
    try {
        const { id } = await context.params;
        const companyId = (session.user as any).companyId;

        const employee = await prisma.employee.findUnique({
            where: { id: id, companyId },
            include: { department: true },
        });

        if (!employee) {
            return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });
        }

        const processedEmployee = {
            ...employee,
            attachments: employee.attachments ? JSON.parse(employee.attachments) : []
        };

        return NextResponse.json(processedEmployee);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
});

function parseSafeDate(d: string | null | undefined) {
    if (!d || String(d).trim() === '') return null;
    const str = String(d).trim();
    let date = new Date(str);
    if (!isNaN(date.getTime())) return date;
    const parts = str.split(/[/.-]/);
    if (parts.length === 3) {
        if (parts[0].length <= 2 && parts[2].length === 4) {
            const [day, month, year] = parts.map(Number);
            if (month >= 1 && month <= 12) {
                date = new Date(year, month - 1, day);
                if (!isNaN(date.getTime())) return date;
            }
        } else if (parts[0].length === 4 && parts[2].length <= 2) {
            const [year, month, day] = parts.map(Number);
            date = new Date(year, month - 1, day);
            if (!isNaN(date.getTime())) return date;
        }
    }
    return null;
}

export const PUT = withProtection(async (request, session, body, context) => {
    try {
        const { id } = await context.params;
        const companyId = (session.user as any).companyId;

        const {
            name, phone, email, nationalId, birthDate, gender, address,
            position, departmentId, hireDate, basicSalary,
            housingAllowance, transportAllowance, foodAllowance,
            insuranceDeduction, taxDeduction,
            bankName, bankAccount,
            attachments, status
        } = body;

        const employee = await prisma.employee.update({
            where: { id: id, companyId },
            data: {
                name,
                phone: phone || null,
                email: email || null,
                nationalId: nationalId || null,
                birthDate: parseSafeDate(birthDate),
                gender: gender || null,
                address: address || null,
                position: position || null,
                hireDate: parseSafeDate(hireDate) || new Date(),
                basicSalary: Number(basicSalary),
                housingAllowance: Number(housingAllowance || 0),
                transportAllowance: Number(transportAllowance || 0),
                foodAllowance: Number(foodAllowance || 0),
                insuranceDeduction: Number(insuranceDeduction || 0),
                taxDeduction: Number(taxDeduction || 0),
                bankName: bankName || null,
                bankAccount: bankAccount || null,
                attachments: attachments ? JSON.stringify(attachments) : null,
                departmentId: departmentId || null,
                branchId: (body.branchId && body.branchId !== 'all') ? body.branchId : undefined,
                status: status || undefined
            } as any
        });

        return NextResponse.json(employee);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "فشل في تحديث بيانات الموظف" }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session, body, context) => {
    try {
        const { id } = await context.params;
        const companyId = (session.user as any).companyId;

        const hasPayrolls = await prisma.payrollLine.findFirst({
            where: { employeeId: id }
        });
        if (hasPayrolls) {
            return NextResponse.json({
                error: 'لا يمكن حذف الموظف لارتباطه بمسيرات رواتب مسجلة'
            }, { status: 400 });
        }

        const hasAdvances = await prisma.advance.findFirst({
            where: { employeeId: id }
        });
        if (hasAdvances) {
            return NextResponse.json({
                error: 'لا يمكن حذف الموظف لوجود سلف مسجلة باسمه'
            }, { status: 400 });
        }

        const hasDeductions = await prisma.deduction.findFirst({
            where: { employeeId: id }
        });
        if (hasDeductions) {
            return NextResponse.json({
                error: 'لا يمكن حذف الموظف لوجود خصومات مسجلة باسمه'
            }, { status: 400 });
        }

        await prisma.employee.delete({
            where: { id: id, companyId }
        });
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "فشل في حذف الموظف" }, { status: 500 });
    }
});
