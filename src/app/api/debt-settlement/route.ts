import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;

        const {
            fromType, fromId,
            toType, toId,
            amount, date, notes
        } = body;

        if (!fromType || !fromId || !toType || !toId || !amount || parseFloat(amount) <= 0) {
            return NextResponse.json({ error: "يرجى ملء كافة البيانات المطلوبة بشكل صحيح" }, { status: 400 });
        }

        if (fromType === toType && fromId === toId) {
            return NextResponse.json({ error: "لا يمكن التحويل لنفس الحساب" }, { status: 400 });
        }

        const financialYear = await prisma.financialYear.findFirst({
            where: { companyId, isOpen: true },
        });

        if (!financialYear) {
            return NextResponse.json({ error: "لا توجد سنة مالية مفتوحة" }, { status: 400 });
        }

        const value = parseFloat(amount);

        const result = await prisma.$transaction(async (tx) => {
            let fromAccountName = "";
            let toAccountName = "";
            let fromMainAccountId = "";
            let toMainAccountId = "";

            // --- Handler for FROM entity ---
            if (fromType === 'customer') {
                const entity = await tx.customer.findUnique({ where: { id: fromId } });
                if (!entity) throw new Error("العميل (المحول منه) غير موجود");
                fromAccountName = entity.name;
                await tx.customer.update({ where: { id: fromId }, data: { balance: { decrement: value } } });
                const acc = await tx.account.findFirst({
                    where: {
                        companyId, type: 'asset', accountCategory: 'detail',
                        OR: [
                            { name: { contains: 'ذمم' } },
                            { name: { contains: 'عملاء' } },
                            { name: { contains: 'مدينون' } },
                        ],
                    },
                });
                if (!acc) throw new Error("حساب العملاء غير موجود");
                fromMainAccountId = acc.id;
            } else if (fromType === 'supplier') {
                const entity = await tx.supplier.findUnique({ where: { id: fromId } });
                if (!entity) throw new Error("المورد (المحول منه) غير موجود");
                fromAccountName = entity.name;
                await tx.supplier.update({ where: { id: fromId }, data: { balance: { decrement: value } } });
                const acc = await tx.account.findFirst({
                    where: {
                        companyId, type: 'liability', accountCategory: 'detail',
                        OR: [
                            { name: { contains: 'موردين' } },
                            { name: { contains: 'دائنون' } },
                            { name: { contains: 'ذمم دائنة' } },
                        ],
                    },
                });
                if (!acc) throw new Error("حساب الموردين غير موجود");
                fromMainAccountId = acc.id;
            } else if (fromType === 'bank') {
                const entity = await tx.treasury.findUnique({ where: { id: fromId } });
                if (!entity) throw new Error("البنك (المحول منه) غير موجود");
                fromAccountName = entity.name;
                await tx.treasury.update({ where: { id: fromId }, data: { balance: { decrement: value } } });
                const treas = await tx.treasury.findUnique({ where: { id: fromId }, select: { accountId: true } });
                if (!treas?.accountId) throw new Error("حساب الخزينة/البنك غير مرتبط");
                fromMainAccountId = treas.accountId;

                await tx.voucher.create({
                    data: {
                        voucherNumber: ((await tx.voucher.findFirst({
                            where: { companyId },
                            orderBy: { voucherNumber: 'desc' },
                        }))?.voucherNumber || 0) + 1,
                        type: 'payment',
                        date: date ? new Date(date) : new Date(),
                        amount: value,
                        description: `تسوية شاملة (محول منه) - ${notes || ''}`,
                        treasuryId: fromId,
                        financialYearId: financialYear.id,
                        companyId,
                    }
                });
            }

            // --- Handler for TO entity ---
            if (toType === 'customer') {
                const entity = await tx.customer.findUnique({ where: { id: toId } });
                if (!entity) throw new Error("العميل (المحول إليه) غير موجود");
                toAccountName = entity.name;
                await tx.customer.update({ where: { id: toId }, data: { balance: { increment: value } } });
                const acc = await tx.account.findFirst({
                    where: {
                        companyId, type: 'asset', accountCategory: 'detail',
                        OR: [
                            { name: { contains: 'ذمم' } },
                            { name: { contains: 'عملاء' } },
                            { name: { contains: 'مدينون' } },
                        ],
                    },
                });
                if (!acc) throw new Error("حساب العملاء غير موجود");
                toMainAccountId = acc.id;
            } else if (toType === 'supplier') {
                const entity = await tx.supplier.findUnique({ where: { id: toId } });
                if (!entity) throw new Error("المورد (المحول إليه) غير موجود");
                toAccountName = entity.name;
                await tx.supplier.update({ where: { id: toId }, data: { balance: { increment: value } } });
                const acc = await tx.account.findFirst({
                    where: {
                        companyId, type: 'liability', accountCategory: 'detail',
                        OR: [
                            { name: { contains: 'موردين' } },
                            { name: { contains: 'دائنون' } },
                            { name: { contains: 'ذمم دائنة' } },
                        ],
                    },
                });
                if (!acc) throw new Error("حساب الموردين غير موجود");
                toMainAccountId = acc.id;
            } else if (toType === 'bank') {
                const entity = await tx.treasury.findUnique({ where: { id: toId } });
                if (!entity) throw new Error("البنك (المحول إليه) غير موجود");
                toAccountName = entity.name;
                await tx.treasury.update({ where: { id: toId }, data: { balance: { increment: value } } });
                const treas = await tx.treasury.findUnique({ where: { id: toId }, select: { accountId: true } });
                if (!treas?.accountId) throw new Error("حساب الخزينة/البنك غير مرتبط");
                toMainAccountId = treas.accountId;

                await tx.voucher.create({
                    data: {
                        voucherNumber: ((await tx.voucher.findFirst({
                            where: { companyId },
                            orderBy: { voucherNumber: 'desc' },
                        }))?.voucherNumber || 0) + 1,
                        type: 'receipt',
                        date: date ? new Date(date) : new Date(),
                        amount: value,
                        description: `تسوية شاملة (محول إليه) - ${notes || ''}`,
                        treasuryId: toId,
                        financialYearId: financialYear.id,
                        companyId,
                    }
                });
            }

            // --- Create Journal Entry ---
            const lastEntry = await tx.journalEntry.findFirst({
                where: { companyId, financialYearId: financialYear.id },
                orderBy: { entryNumber: 'desc' },
            });
            const entryNumber = (lastEntry?.entryNumber || 0) + 1;

            const typeNames: Record<string, string> = { customer: 'العميل', supplier: 'المورد', bank: 'الخزينة/البنك' };
            const fromEntityStr = `${typeNames[fromType]} (${fromAccountName})`;
            const toEntityStr = `${typeNames[toType]} (${toAccountName})`;

            const entry = await tx.journalEntry.create({
                data: {
                    entryNumber,
                    date: date ? new Date(date) : new Date(),
                    description: `تسوية شاملة: حوالة من ${fromEntityStr} إلى ${toEntityStr} - ${notes || ''}`,
                    financialYearId: financialYear.id,
                    companyId,
                    isPosted: true,
                    referenceType: 'comprehensive_settlement',
                    lines: {
                        create: [
                            {
                                accountId: toMainAccountId,
                                debit: value,
                                credit: 0,
                                description: `مدين - حوالة من ${fromAccountName}`
                            },
                            {
                                accountId: fromMainAccountId,
                                debit: 0,
                                credit: value,
                                description: `دائن - حوالة إلى ${toAccountName}`
                            }
                        ]
                    }
                }
            });

            return {
                success: true,
                from: fromAccountName,
                to: toAccountName,
                amount: value,
                journalEntryId: entry.id
            };
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error: any) {
        console.error('Comprehensive Settlement error:', error);
        return NextResponse.json({ error: error.message || 'فشل في تنفيذ العملية' }, { status: 500 });
    }
});

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const settlements = await prisma.journalEntry.findMany({
            where: {
                companyId,
                referenceType: 'comprehensive_settlement'
            },
            include: {
                lines: { include: { account: true } }
            },
            orderBy: {
                date: 'desc'
            },
            take: 50
        });

        const results = settlements.map(entry => {
            const debitLine = entry.lines.find(l => l.debit > 0);
            const creditLine = entry.lines.find(l => l.credit > 0);

            const getTypeFromAccount = (accName: string, accType: string) => {
                if (accName.includes('العملاء') || accType === 'asset' && !accName.includes('البنك') && !accName.includes('الخزينة')) return 'العميل';
                if (accName.includes('الموردين') || accType === 'liability') return 'المورد';
                if (accName.includes('البنك') || accName.includes('الخزينة') || accName.includes('بنك') || accName.includes('خزينة')) return 'الخزينة/البنك';
                return 'طرف';
            };

            const fromAccountName = creditLine?.account?.name || '';
            const toAccountName = debitLine?.account?.name || '';
            const fromType = getTypeFromAccount(fromAccountName, creditLine?.account?.type || '');
            const toType = getTypeFromAccount(toAccountName, debitLine?.account?.type || '');

            let fromName = '-';
            let toName = '-';
            let notes = entry.description;

            const match = entry.description.match(/من (.*?) إلى (.*?) - (.*)/);
            if (match) {
                fromName = match[1];
                toName = match[2];
                notes = match[3];
            } else {
                const legacyMatch = entry.description.match(/تسوية شاملة: حوالة من (.*?) إلى (.*)/);
                if (legacyMatch) {
                    fromName = legacyMatch[1];
                    toName = legacyMatch[2];
                }
            }

            if (fromName.includes('(')) fromName = fromName.replace(/^.*?\(|\)$/g, '');
            if (toName.includes('(')) toName = toName.replace(/^.*?\(|\)$/g, '');

            return {
                id: entry.id,
                date: entry.date,
                description: entry.description,
                notes,
                fromConfig: { name: fromName.trim(), type: fromType },
                toConfig: { name: toName.trim(), type: toType },
                amount: entry.lines.reduce((sum, l) => sum + l.debit, 0),
                entryNumber: entry.entryNumber,
                lines: entry.lines.map(l => ({
                    id: l.id,
                    debit: l.debit,
                    credit: l.credit,
                    description: l.description,
                    accountName: l.account?.name || 'غير محدد',
                }))
            };
        });

        return NextResponse.json(results);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
