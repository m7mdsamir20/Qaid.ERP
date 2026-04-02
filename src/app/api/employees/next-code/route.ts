import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const lastEmployee = await prisma.employee.findFirst({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            select: { code: true }
        });

        let nextCode = 'EMP-001';

        if (lastEmployee && lastEmployee.code) {
            const match = lastEmployee.code.match(/(\d+)/);
            if (match) {
                const lastNum = parseInt(match[0]);
                nextCode = `EMP-${String(lastNum + 1).padStart(3, '0')}`;
            } else {
                nextCode = `EMP-${Date.now().toString().slice(-3)}`;
            }
        }

        return NextResponse.json({ nextCode });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ nextCode: 'EMP-001' });
    }
});
