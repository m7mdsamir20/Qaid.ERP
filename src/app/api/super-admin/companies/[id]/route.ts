import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

// رفع حد الوقت لـ 60 ثانية على Vercel لأن الحذف الكامل يحتاج وقت
export const maxDuration = 60;

// GET Single Company
export const GET = withProtection(async (request, session, body, context) => {
    try {
        const { id } = await context.params;
        const company = await prisma.company.findUnique({
            where: { id },
            include: {
                subscription: true,
                users: {
                    where: { role: 'admin' },
                    select: { id: true, name: true, username: true, email: true, phone: true },
                    take: 1
                }
            }
        });
        if (!company) return NextResponse.json({ error: 'الشركة غير موجودة' }, { status: 404 });
        return NextResponse.json(company);
    } catch (error: any) {
        return NextResponse.json({ error: 'فشل جلب البيانات' }, { status: 500 });
    }
}, { requireSuperAdmin: true });

// UPDATE Company (Robust Fix for JSON corruption)
export const PUT = withProtection(async (request, session, body, context) => {
    try {
        const { id } = await context.params;
        const { 
            name, nameEn, phone, email, address, businessType, countryCode, isActive,
            adminName, adminEmail, adminPhone, newPassword, 
            plan, startDate, endDate, maxUsers, maxBranches, features, notes 
        } = body;

        console.log(`[ERP-SYNC] Updating Company: ${id}`);

        // 1. Update Company & User
        await prisma.$transaction(async (tx) => {
            const adminUpdateData: any = {};
            if (adminName) adminUpdateData.name = adminName;
            if (adminPhone) adminUpdateData.phone = adminPhone;
            if (newPassword) {
                const bcrypt = await import('bcryptjs');
                adminUpdateData.password = await bcrypt.hash(newPassword, 10);
            }

            await tx.company.update({
                where: { id },
                data: {
                    name: name || undefined,
                    nameEn: nameEn || undefined,
                    phone: phone || undefined,
                    email: email || undefined,
                    address: address || undefined,
                    businessType: businessType?.toLowerCase() || undefined,
                    countryCode: countryCode || undefined,
                    isActive: isActive !== undefined ? isActive : undefined,
                },
            });

            if (Object.keys(adminUpdateData).length > 0) {
                await tx.user.updateMany({
                    where: { companyId: id, role: 'admin' },
                    data: adminUpdateData,
                });
            }
        });

        // 2. Update Subscription (Preventing JSON Corruption)
        // Ensure features is a CLEAN string. If it's an object, stringify it.
        // If it's a string, we save it as is.
        let finalFeatures = features;
        if (typeof features === 'object' && features !== null) {
            finalFeatures = JSON.stringify(features);
        } else if (!features) {
            finalFeatures = "{}";
        }

        const subData: any = { features: finalFeatures };
        if (plan) subData.plan = plan;
        if (startDate) subData.startDate = new Date(startDate);
        if (endDate) subData.endDate = new Date(endDate);
        if (isActive !== undefined) subData.isActive = isActive;
        if (maxUsers) subData.maxUsers = parseInt(String(maxUsers));
        if (maxBranches) subData.maxBranches = parseInt(String(maxBranches));
        if (notes !== undefined) subData.notes = notes;

        const subPrisma = (prisma as any).subscription;
        const exists = await subPrisma.findUnique({ where: { companyId: id } });

        if (exists) {
            await subPrisma.update({
                where: { companyId: id },
                data: subData
            });
        } else {
            await subPrisma.create({
                data: { ...subData, companyId: id, plan: plan || 'basic', startDate: new Date(), endDate: new Date() }
            });
        }

        return NextResponse.json({ success: true, saved: finalFeatures });

    } catch (error: any) {
        console.error("[ERP-SYNC] Error:", error);
        return NextResponse.json({ error: 'فشل التحديث', details: error.message }, { status: 500 });
    }
}, { requireSuperAdmin: true });

// DELETE Company (Cascade delete all related data)
export const DELETE = withProtection(async (request, session, body, context) => {
    try {
        const { id } = await context.params;

        // Verify company exists first
        const company = await prisma.company.findUnique({ where: { id } });
        if (!company) {
            return NextResponse.json({ error: 'الشركة غير موجودة' }, { status: 404 });
        }

        // حذف تسلسلي مع timeout كافي
        await prisma.$transaction(async (tx) => {
            // Delete in dependency order (leaf tables first)
            await tx.stocktakingLine.deleteMany({ where: { stocktaking: { companyId: id } } });
            await tx.stocktaking.deleteMany({ where: { companyId: id } });
            await tx.warehouseTransferLine.deleteMany({ where: { transfer: { companyId: id } } });
            await tx.warehouseTransfer.deleteMany({ where: { companyId: id } });
            await tx.stockMovement.deleteMany({ where: { companyId: id } });
            await tx.stock.deleteMany({ where: { warehouse: { companyId: id } } });
            await tx.invoiceLine.deleteMany({ where: { invoice: { companyId: id } } });
            await tx.invoice.deleteMany({ where: { companyId: id } });
            await tx.installment.deleteMany({ where: { company: { id } } });
            await tx.installmentPlan.deleteMany({ where: { companyId: id } });
            await tx.voucher.deleteMany({ where: { companyId: id } });
            await tx.journalEntryLine.deleteMany({ where: { journalEntry: { companyId: id } } });
            await tx.journalEntry.deleteMany({ where: { companyId: id } });
            await tx.openingBalance.deleteMany({ where: { companyId: id } });
            await tx.fixedAssetDisposal.deleteMany({ where: { companyId: id } });
            await tx.fixedAsset.deleteMany({ where: { companyId: id } });
            await tx.payrollLine.deleteMany({ where: { payroll: { companyId: id } } });
            await tx.payroll.deleteMany({ where: { companyId: id } });
            await tx.advance.deleteMany({ where: { companyId: id } });
            await tx.deduction.deleteMany({ where: { companyId: id } });
            await tx.employee.deleteMany({ where: { companyId: id } });
            await tx.partnerTransaction.deleteMany({ where: { companyId: id } });
            await tx.partner.deleteMany({ where: { companyId: id } });
            await (tx as any).quotation.deleteMany({ where: { companyId: id } });
            await tx.customer.deleteMany({ where: { companyId: id } });
            await tx.supplier.deleteMany({ where: { companyId: id } });
            await tx.treasury.deleteMany({ where: { companyId: id } });
            await tx.account.deleteMany({ where: { companyId: id } });
            await tx.costCenter.deleteMany({ where: { companyId: id } });
            await tx.financialYear.deleteMany({ where: { companyId: id } });
            await tx.item.deleteMany({ where: { companyId: id } });
            await tx.category.deleteMany({ where: { companyId: id } });
            await tx.unit.deleteMany({ where: { companyId: id } });
            await tx.warehouse.deleteMany({ where: { companyId: id } });
            await tx.notification.deleteMany({ where: { companyId: id } });
            await tx.printerSetting.deleteMany({ where: { companyId: id } });
            await tx.role.deleteMany({ where: { companyId: id } });
            await tx.user.deleteMany({ where: { companyId: id } });
            await tx.department.deleteMany({ where: { companyId: id } });
            await tx.branch.deleteMany({ where: { companyId: id } });
            await (tx as any).subscription.deleteMany({ where: { companyId: id } });
            await tx.company.delete({ where: { id } });
        }, { timeout: 55000 });

        return NextResponse.json({ success: true, message: 'تم حذف الشركة وكافة بياناتها بنجاح' });

    } catch (error: any) {
        console.error("[DELETE-COMPANY] Error:", error);
        return NextResponse.json({ error: 'فشل حذف الشركة', details: error.message }, { status: 500 });
    }
}, { requireSuperAdmin: true });

