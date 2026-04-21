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
        
        // Only filter by branch if a specific branchId is provided and it's not 'all'
        if (branchId && branchId !== 'all' && branchId !== 'undefined' && branchId !== 'null') {
            where.branchId = branchId;
        }

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

function parseSafeDate(d: string | null | undefined) {
    if (!d || String(d).trim() === '') return null;
    const str = String(d).trim();
    
    // Standard ISO/browser format: YYYY-MM-DD
    let date = new Date(str);
    if (!isNaN(date.getTime())) return date;
    
    // Support DD/MM/YYYY or DD-MM-YYYY
    const parts = str.split(/[/.-]/);
    if (parts.length === 3) {
        // Case: DD/MM/YYYY (common manual entry)
        if (parts[0].length <= 2 && parts[2].length === 4) {
            const [day, month, year] = parts.map(Number);
            if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                date = new Date(year, month - 1, day);
                if (!isNaN(date.getTime())) return date;
            }
        }
        // Case: YYYY/MM/DD
        else if (parts[0].length === 4 && parts[2].length <= 2) {
            const [year, month, day] = parts.map(Number);
            date = new Date(year, month - 1, day);
            if (!isNaN(date.getTime())) return date;
        }
    }
    
    return null;
}

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

        const targetBranchId = (body.branchId && body.branchId !== 'all') ? body.branchId : 
                               ((session.user as any).activeBranchId && (session.user as any).activeBranchId !== 'all') ? (session.user as any).activeBranchId : null;

        // Ensure we have a valid branchId if not provided
        let finalBranchId = targetBranchId;
        if (!finalBranchId) {
            const mainBranch = await prisma.branch.findFirst({ where: { companyId, isMain: true } });
            finalBranchId = mainBranch?.id || null;
        }

        const employee = await prisma.employee.create({
            data: {
                code,
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
                status: status || 'active',
                companyId,
                branchId: finalBranchId,
            } as any,
            include: { department: true }
        });

        return NextResponse.json(employee, { status: 201 });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: "فشل في تسجيل الموظف" }, { status: 500 });
    }
});
