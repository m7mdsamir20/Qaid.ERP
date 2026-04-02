import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const partners = await prisma.partner.findMany({
            where: { companyId },
            include: { _count: { select: { transactions: true } } },
            orderBy: { createdAt: 'asc' },
        });
        return NextResponse.json(partners);
    } catch {
        return NextResponse.json([], { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const { name, capital, phone, notes } = body;

        if (!name || capital === undefined)
            return NextResponse.json({ error: "بيانات الشريك ناقصة" }, { status: 400 });

        const partner = await prisma.partner.create({
            data: {
                name, share: 0, capital: Number(capital), balance: 0,
                phone: phone || null, notes: notes || null,
                companyId,
            } as any,
        });

        const allPartners = await prisma.partner.findMany({ where: { companyId } });
        const totalCapital = allPartners.reduce((acc, p) => acc + (p.capital || 0), 0);
        if (totalCapital > 0) {
            for (const p of allPartners) {
                await prisma.partner.update({
                    where: { id: p.id },
                    data: { share: Number(((p.capital / totalCapital) * 100).toFixed(4)) } as any
                });
            }
        }

        const cost = Number(capital);
        if (cost > 0) {
            const partnersParentAccount = await prisma.account.findFirst({
                where: {
                    companyId,
                    OR: [
                        { code: '3200' },
                        { name: { contains: 'حسابات الشركاء' } },
                        { name: { contains: 'شركاء' } },
                    ],
                },
            });

            let partnerAccount = null;
            if (partnersParentAccount) {
                const siblings = await prisma.account.findMany({
                    where: { companyId, parentId: partnersParentAccount.id },
                    orderBy: { code: 'desc' },
                });

                let nextCode = '3201';
                if (siblings.length > 0) {
                    const lastCode = parseInt(siblings[0].code) || 3200;
                    nextCode = String(lastCode + 1);
                }

                partnerAccount = await prisma.account.create({
                    data: {
                        code:            nextCode,
                        name:            `رأس مال ${name}`,
                        nature:          'credit',
                        type:            'equity',
                        accountCategory: 'detail',
                        level:           (partnersParentAccount.level || 1) + 1,
                        isParent:        false,
                        parentId:        partnersParentAccount.id,
                        companyId,
                    },
                });

                await prisma.account.update({
                    where: { id: partnersParentAccount.id },
                    data:  { isParent: true },
                });
            }

            if (partnerAccount) {
                const currentYear = await prisma.financialYear.findFirst({
                    where:   { companyId, isOpen: true },
                    orderBy: { startDate: 'desc' },
                });

                if (currentYear) {
                    await prisma.openingBalance.create({
                        data: {
                            accountId:       partnerAccount.id,
                            financialYearId: currentYear.id,
                            debit:           0,
                            credit:          cost,
                            companyId,
                        },
                    });
                }
            }
        }

        return NextResponse.json(partner, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "فشل إضافة الشريك" }, { status: 500 });
    }
});

export const PUT = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const { id, name, capital, phone, notes } = body;

        if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });

        await prisma.partner.update({
            where: { id, companyId },
            data: { name, capital: Number(capital), phone: phone || null, notes: notes || null } as any,
        });

        const allPartners = await prisma.partner.findMany({ where: { companyId } });
        const totalCapital = allPartners.reduce((acc, p) => acc + (p.capital || 0), 0);

        if (totalCapital > 0) {
            for (const p of allPartners) {
                const newShare = (p.capital / totalCapital) * 100;
                await prisma.partner.update({
                    where: { id: p.id },
                    data: { share: Number(newShare.toFixed(4)) } as any
                });
            }
        }

        const updatedPartner = await prisma.partner.findUnique({ where: { id, companyId } });
        return NextResponse.json(updatedPartner);
    } catch {
        return NextResponse.json({ error: "فشل التعديل" }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const { id } = body;

        if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });

        await prisma.partnerTransaction.deleteMany({ where: { partnerId: id, companyId } });
        await prisma.partner.delete({ where: { id, companyId } });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "فشل الحذف" }, { status: 500 });
    }
});
