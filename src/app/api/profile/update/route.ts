import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const POST = withProtection(async (request, session, body) => {
    try {
        const userId = (session.user as any).id;
        const { name, email, phone, gender, avatar } = body;

        await prisma.user.update({
            where: { id: userId },
            data: { 
                name, 
                email, 
                phone, 
                gender: gender || 'male', 
                avatar: avatar || 'm1' 
            }
        });

        return NextResponse.json({
            success: true,
            user: {
                name,
                email,
                phone,
                gender: gender || 'male',
                avatar: avatar || 'm1'
            }
        });
    } catch (error: any) {
        console.error("Profile Update Error Detailed:", error);
        return NextResponse.json({ error: "فشل تحديث البيانات: " + error.message }, { status: 500 });
    }
});
