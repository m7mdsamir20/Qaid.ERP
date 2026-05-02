import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import bcrypt from "bcryptjs";
import { unlink } from 'fs/promises';
import path from 'path';

export const GET = withProtection(async (request, session) => {
    try {
        const user = session.user as any;
        if (!user || (!user.companyId && user.role !== 'superadmin' && !user.isSuperAdmin)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const companyId = user.companyId;

        const [company, users, roles, financialYears] = await Promise.all([
            prisma.company.findUnique({ where: { id: companyId }, include: { subscription: true } }),
            (prisma as any).user.findMany({
                where: { companyId },
                select: { id: true, name: true, username: true, email: true, phone: true, role: true, status: true, gender: true, avatar: true, branchId: true, allowedBranches: true, customRole: { select: { id: true, name: true, permissions: true } } },
                orderBy: { createdAt: 'asc' }
            }),
            prisma.role.findMany({ where: { companyId } }),
            prisma.financialYear.findMany({ where: { companyId }, orderBy: { startDate: 'desc' } }),
        ]);

        let notificationSettings = null;
        if (company?.notificationSettings) {
            try { notificationSettings = JSON.parse(company.notificationSettings); } catch (e) { }
        }

        let restaurantSettings = null;
        if ((company as any)?.restaurantSettings) {
            try { restaurantSettings = JSON.parse((company as any).restaurantSettings); } catch (e) { }
        }

        return NextResponse.json({
            company,
            users,
            roles,
            financialYears,
            notificationSettings,
            restaurantSettings,
        });
    } catch (e: any) {
        console.error("GET Settings Error:", e);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
});

export const PUT = withProtection(async (request, session, body) => {
    try {
        const user = session.user as any;
        if (!user || !user.companyId || (user.role !== 'admin' && !user.isSuperAdmin && user.role !== 'superadmin')) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const companyId = user.companyId;
        const { action, data } = body;

        if (action === 'update_company') {
            // 1. Get current logo to check if it needs cleanup later
            const currentCompany = await prisma.company.findUnique({
                where: { id: companyId },
                select: { logo: true }
            });

            const updated = await prisma.company.update({
                where: { id: companyId },
                data: {
                    name: data.name, nameEn: data.nameEn, phone: data.phone,
                    email: data.email, taxNumber: data.taxNumber,
                    commercialRegister: data.commercialRegister,
                    addressRegion: data.addressRegion || null,
                    addressCity: data.addressCity || null,
                    addressDistrict: data.addressDistrict || null,
                    addressStreet: data.addressStreet || null,
                    website: data.website, logo: data.logo,
                }
            });

            // 2. If logo was changed/removed, clean up old file from server
            if (currentCompany?.logo && currentCompany.logo !== data.logo) {
                try {
                    // Check if the logo is a local upload (starts with /uploads/)
                    if (currentCompany.logo.startsWith('/uploads/')) {
                        const oldFilename = currentCompany.logo.replace('/uploads/', '');
                        const oldFilepath = path.join(process.cwd(), 'public', 'uploads', oldFilename);
                        await unlink(oldFilepath);
                        console.log(`Deleted old logo file: ${oldFilepath}`);
                    }
                } catch (err) {
                    console.error("Failed to delete orphaned logo file:", err);
                }
            }

            return NextResponse.json(updated);
        }

        if (action === 'update_notifications') {
            await prisma.company.update({
                where: { id: companyId },
                data: { notificationSettings: JSON.stringify(data) }
            });
            return NextResponse.json({ success: true });
        }

        if (action === 'update_tax') {
            await prisma.company.update({
                where: { id: companyId },
                data: { taxSettings: JSON.stringify(data) }
            });
            return NextResponse.json({ success: true });
        }

        if (action === 'update_general') {
            const updated = await prisma.company.update({
                where: { id: companyId },
                data: { currency: data.currency, timezone: data.timezone, calendarType: data.calendarType, dateFormat: data.dateFormat, countryCode: data.countryCode }
            });
            return NextResponse.json(updated);
        }

        if (action === 'update_restaurant') {
            await prisma.company.update({
                where: { id: companyId },
                data: { restaurantSettings: JSON.stringify(data) } as any
            });
            return NextResponse.json({ success: true });
        }

        if (action === 'update_financial_year') {
            const updateData: any = {};
            if (data.name) updateData.name = data.name;
            if (data.startDate) updateData.startDate = new Date(data.startDate);
            if (data.endDate) updateData.endDate = new Date(data.endDate);
            if (data.isOpen !== undefined) updateData.isOpen = data.isOpen;
            if (data.openingBalancesLocked !== undefined) updateData.openingBalancesLocked = data.openingBalancesLocked;

            const updated = await prisma.financialYear.update({
                where: { id: data.id, companyId },
                data: updateData
            });
            return NextResponse.json(updated);
        }

        if (action === 'clear_all_financial_years') {
            await prisma.financialYear.deleteMany({ where: { companyId } });
            return NextResponse.json({ success: true });
        }

        if (action === 'create_first_financial_year') {
            const existing = await prisma.financialYear.findFirst({ where: { companyId, isOpen: true } });
            if (existing) return NextResponse.json({ error: "توجد سنة مالية نشطة بالفعل." }, { status: 400 });

            const startDate = new Date(data.startDate);
            const endDate = new Date(data.endDate);
            if (endDate <= startDate) return NextResponse.json({ error: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية." }, { status: 400 });

            const startYear = startDate.getFullYear();
            const endYear = endDate.getFullYear();
            const autoName = startYear === endYear ? `السنة المالية ${startYear}` : `السنة المالية ${startYear}/${endYear}`;

            const newYear = await prisma.financialYear.create({
                data: { name: data.name || autoName, startDate, endDate, companyId, isOpen: true }
            });
            return NextResponse.json(newYear);
        }

        if (action === 'close_financial_year') {
            const result = await prisma.$transaction(async (tx) => {
                const closedYear = await tx.financialYear.update({ where: { id: data.id, companyId }, data: { isOpen: false } });
                const newStartDate = new Date(closedYear.endDate);
                newStartDate.setDate(newStartDate.getDate() + 1);

                let newEndDate = new Date(newStartDate);
                newEndDate.setFullYear(newEndDate.getFullYear() + 1);
                newEndDate.setDate(newEndDate.getDate() - 1);

                const startYear = newStartDate.getFullYear();
                const endYear = newEndDate.getFullYear();
                const newName = startYear === endYear ? `السنة المالية ${startYear}` : `السنة المالية ${startYear}/${endYear}`;

                const newYear = await tx.financialYear.create({
                    data: { name: newName, startDate: newStartDate, endDate: newEndDate, companyId, isOpen: true }
                });
                return { closedYear, newYear };
            });
            return NextResponse.json(result);
        }

        if (action === 'update_user_status') {
            if (data.userId === user.id) return NextResponse.json({ error: "لا يمكنك تغيير حالتك" }, { status: 400 });
            const updated = await prisma.user.update({
                where: { id: data.userId, companyId }, data: { status: data.status }
            });
            return NextResponse.json(updated);
        }

        if (action === 'delete_user') {
            if (data.userId === user.id) return NextResponse.json({ error: "لا يمكنك حذف نفسك" }, { status: 400 });
            await prisma.user.delete({ where: { id: data.userId, companyId } });
            return NextResponse.json({ success: true });
        } else if (action === 'update_user_full') {
            const { userId, name, username, email, phone, roleId, status, customPermissions, password } = data;

            const allowedBranchesArr: string[] = data.allowedBranches || [];
            const updateData: any = {
                name, username, email, phone, role: roleId, status,
                branchId: data.branchId || null,
                allowedBranches: allowedBranchesArr.length > 0 ? JSON.stringify(allowedBranchesArr) : null,
            };
            if (password) {
                updateData.password = await bcrypt.hash(password, 10);
            }

            if (roleId !== 'admin') {
                const roleName = `صلاحيات - ${username}`;
                const permsStr = JSON.stringify(customPermissions || {});

                const existingRole = await prisma.role.findFirst({
                    where: { name: roleName, companyId }
                });

                let assignedRoleId;
                if (existingRole) {
                    const updatedRole = await prisma.role.update({
                        where: { id: existingRole.id },
                        data: { permissions: permsStr }
                    });
                    assignedRoleId = updatedRole.id;
                } else {
                    const newRole = await prisma.role.create({
                        data: { name: roleName, permissions: permsStr, companyId }
                    });
                    assignedRoleId = newRole.id;
                }
                updateData.roleId = assignedRoleId;
            } else {
                updateData.roleId = null;
            }

            await prisma.user.update({
                where: { id: userId, companyId },
                data: updateData
            });

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
    } catch (e: any) {
        console.error("PUT Settings Error:", e);
        return NextResponse.json({ error: "فشل الحفظ: " + (e.message || "خطأ غير متوقع") }, { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const user = session.user as any;
        if (!user || (!user.companyId && user.role !== 'superadmin' && !user.isSuperAdmin)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const companyId = user.companyId;
        const { action, data } = body;

        if (action === 'create_user') {
            const existing = await prisma.user.findUnique({ where: { username: data.username } });
            if (existing) return NextResponse.json({ error: "اسم المستخدم موجود مسبقاً" }, { status: 400 });

            const currentUser = await prisma.user.findUnique({
                where: { id: user.id },
                include: { customRole: true },
            });
            const isAdminOrSuper = currentUser?.role === 'admin' || currentUser?.isSuperAdmin;

            if (!isAdminOrSuper && data.customPermissions) {
                let myPerms: any = {};
                try {
                    myPerms = JSON.parse(currentUser?.customRole?.permissions || '{}');
                } catch { }

                Object.keys(data.customPermissions).forEach(section => {
                    Object.keys(data.customPermissions[section]).forEach(pageId => {
                        const myPerm = myPerms[section]?.[pageId];
                        const newPerm = data.customPermissions[section][pageId];

                        if (newPerm.view && !myPerm?.view)
                            data.customPermissions[section][pageId].view = false;
                        if (newPerm.create && !myPerm?.create)
                            data.customPermissions[section][pageId].create = false;
                        if (newPerm.editDelete && !myPerm?.editDelete)
                            data.customPermissions[section][pageId].editDelete = false;
                    });
                });
            }

            const hashedPassword = await bcrypt.hash(data.password, 10);
            let assignedRoleId = null;
            let assignedRoleStr = data.roleId || 'user';

            if (assignedRoleStr !== 'admin') {
                const roleName = `صلاحيات - ${data.username}`;
                const existingRole = await prisma.role.findFirst({
                    where: { name: roleName, companyId }
                });

                if (existingRole) {
                    const updatedRole = await prisma.role.update({
                        where: { id: existingRole.id },
                        data: {
                            permissions: JSON.stringify(data.customPermissions || {}),
                        }
                    });
                    assignedRoleId = updatedRole.id;
                } else {
                    const newRole = await prisma.role.create({
                        data: {
                            name: roleName,
                            permissions: JSON.stringify(data.customPermissions || {}),
                            companyId
                        }
                    });
                    assignedRoleId = newRole.id;
                }
            }

            const allowedBranchesArr: string[] = data.allowedBranches || [];
            const newUser = await prisma.user.create({
                data: {
                    name: data.name, username: data.username, email: data.email,
                    phone: data.phone, password: hashedPassword, role: assignedRoleStr,
                    gender: data.gender || 'male', avatar: data.avatar || 'male1',
                    roleId: assignedRoleId, companyId, status: data.status,
                    branchId: data.branchId || null,
                    allowedBranches: allowedBranchesArr.length > 0 ? JSON.stringify(allowedBranchesArr) : null,
                    isPhoneVerified: true
                } as any
            });
            return NextResponse.json(newUser, { status: 201 });
        }

        if (action === 'create_role') {
            const newRole = await prisma.role.create({
                data: { name: data.name, permissions: JSON.stringify(data.pages), companyId }
            });
            return NextResponse.json(newRole, { status: 201 });
        }


        return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
    } catch (e: any) {
        console.error("POST Settings Error:", e);
        return NextResponse.json({ error: "فشل الإضافة: " + (e.message || "خطأ غير متوقع") }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session, body) => {
    try {
        const user = session.user as any;
        if (!user || (!user.companyId && !user.isSuperAdmin && user.role !== 'superadmin')) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const companyId = user.companyId;
        const { action, data } = body;

        if (action === 'delete_user') {
            if (data.userId === user.id) return NextResponse.json({ error: "لا يمكنك حذف نفسك" }, { status: 400 });

            if (companyId) {
                await prisma.user.delete({ where: { id: data.userId, companyId } });
            } else if (user.role === 'superadmin' || user.isSuperAdmin) {
                await prisma.user.delete({ where: { id: data.userId } });
            } else {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            return NextResponse.json({ success: true });
        }
        return NextResponse.json({ error: "الإجراء غير معروف أو غير مصرح به" }, { status: 400 });
    } catch (e: any) {
        console.error("DELETE Settings Error:", e);
        return NextResponse.json({ error: "فشل الحذف: " + (e.message || "خطأ غير متوقع") }, { status: 500 });
    }
});
