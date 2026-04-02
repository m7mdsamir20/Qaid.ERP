import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import bcrypt from "bcryptjs";

export const POST = withProtection(async (request, session, body) => {
    try {
        const userId = (session.user as any).id;
        const { oldPassword, newPassword } = body;

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user || !user.password) {
            return NextResponse.json({ error: "لا يمكن العثور على المستخدم" }, { status: 404 });
        }

        const isOldPasswordMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isOldPasswordMatch) {
            return NextResponse.json({ error: "كلمة المرور الحالية غير صحيحة" }, { status: 400 });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedNewPassword }
        });

        return NextResponse.json({ success: true, message: "تم تغيير كلمة المرور بنجاح" });
    } catch (error: any) {
        console.error("Change Password Error:", error);
        return NextResponse.json({ error: "فشل تغيير كلمة المرور" }, { status: 500 });
    }
});
