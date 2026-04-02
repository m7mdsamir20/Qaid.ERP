import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { getBranchFilter } from '@/lib/apiAuth';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const activeBranchId = (session.user as any).activeBranchId;
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId') || activeBranchId;

        const where: any = { companyId };
        if (branchId && branchId !== 'all') where.branchId = branchId;

        const employees = await prisma.employee.findMany({
            where,
            include: { department: true },
            orderBy: { code: 'asc' },
        });

        const processedEmployees = employees.map(emp => ({
            ...emp,
            attachments: emp.attachments ? JSON.parse(emp.attachments) : []
        }));

        return NextResponse.json(processedEmployees);
    } catch (e) {
        console.error(e);
        return NextResponse.json([], { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;

        const {
            code, name, phone, email, nationalId, birthDate, gender, address,
            position, departmentId, hireDate, basicSalary,
            housingAllowance, transportAllowance, foodAllowance,
            insuranceDeduction, taxDeduction,
            bankName, bankAccount,
            attachments, status
        } = body;

        if (!code || !name || !hireDate || basicSalary === undefined) {
            return NextResponse.json({ error: "البيانات الأساسية مطلوبة (الكود، الاسم، تاريخ التعيين، الراتب الأساسي)" }, { status: 400 });
        }

        const isExist = await prisma.employee.findFirst({
            where: { code, companyId }
        });

        if (isExist) {
            return NextResponse.json({ error: "كود الموظف مستخدم مسبقاً" }, { status: 400 });
        }

        const employee = await prisma.employee.create({
            data: {
                code,
                name,
                phone: phone || null,
                email: email || null,
                nationalId: nationalId || null,
                birthDate: birthDate ? new Date(birthDate) : null,
                gender: gender || null,
                address: address || null,
                position: position || null,
                hireDate: new Date(hireDate),
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
                status: status || 'active',
                companyId,
                branchId: body.branchId || (session.user as any).activeBranchId || null,
            } as any,
            include: { department: true }
        });

        return NextResponse.json(employee, { status: 201 });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: "فشل في تسجيل الموظف" }, { status: 500 });
    }
});
