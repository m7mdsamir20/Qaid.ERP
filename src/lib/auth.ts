import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";


export const authOptions: AuthOptions = {
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                username: { label: "اسم المستخدم", type: "text" },
                password: { label: "كلمة المرور", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) {
                    throw new Error("بيانات الدخول غير مكتملة");
                }

                // جلب بيانات المستخدم الكاملة مرة واحدة فقط عند تسجيل الدخول
                const user: any = await (prisma as any).user.findFirst({
                    where: {
                        OR: [
                            { email: { equals: credentials.username, mode: 'insensitive' } },
                            { username: { equals: credentials.username, mode: 'insensitive' } }
                        ]
                    },
                    include: {
                        company: {
                            include: {
                                subscription: true,
                                branches: { where: { isActive: true }, orderBy: { isMain: 'desc' } }
                            }
                        },
                        customRole: true
                    }
                });

                if (!user || !user.password) throw new Error("بيانات الدخول غير صحيحة");
                if (user.status !== "active") throw new Error("عفواً، الحساب موقوف، يرجى مراجعة مدير النظام.");
                if (!user.isPhoneVerified) throw new Error("برجاء تأكيد رقم الهاتف أولاً لإتمام التسجيل");

                const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
                if (!isPasswordValid) throw new Error("كلمة المرور غير صحيحة");

                if (!user.isSuperAdmin && user.role !== 'superadmin') {
                    if (!user.company) throw new Error("لا توجد شركة مرتبطة بهذا الحساب");
                    if (!user.company.isActive) throw new Error("اشتراك الشركة غير مفعل، يرجى مراجعة الإدارة");
                }

                const branches = user.company?.branches || [];
                const mainBranch = branches.find((b: any) => b.isMain) || branches[0];

                let permissions = {};
                try {
                    if (user.customRole?.permissions) permissions = JSON.parse(user.customRole.permissions);
                } catch {}

                let allowedBranches = null;
                try {
                    if (user.allowedBranches) allowedBranches = JSON.parse(user.allowedBranches);
                } catch {}

                const sub = user.company?.subscription;

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    username: user.username,
                    role: user.role,
                    companyId: user.companyId,
                    isSuperAdmin: !!user.isSuperAdmin,
                    branchId: user.branchId || null,
                    activeBranchId: user.branchId || mainBranch?.id || null,
                    activeBranchName: user.branchId
                        ? branches.find((b: any) => b.id === user.branchId)?.name || 'الفرع الرئيسي'
                        : mainBranch?.name || '',
                    branches: branches.map((b: any) => ({ id: b.id, name: b.name, isMain: b.isMain })),
                    allowedBranches,
                    gender: user.gender || 'male',
                    avatar: user.avatar || 'm1',
                    permissions,
                    currency: user.company?.currency || 'EGP',
                    companyName: user.company?.name || '',
                    companyLogo: user.company?.logo || '',
                    taxNumber: user.company?.taxNumber || '',
                    commercialRegister: user.company?.commercialRegister || '',
                    phone: user.company?.phone || '',
                    address: user.company?.address || '',
                    businessType: user.company?.businessType || 'TRADING',
                    subscription: sub ? {
                        plan: sub.plan,
                        endDate: sub.endDate,
                        isActive: sub.isActive,
                        features: sub.features,
                        maxUsers: sub.maxUsers,
                        maxBranches: sub.maxBranches,
                        startDate: sub.startDate,
                    } : null,
                };
            }
        })
    ],
    session: { strategy: "jwt" },
    callbacks: {
        async jwt({ token, user, trigger, session }: any) {
            // عند تسجيل الدخول: حفظ كل البيانات في التوكن مرة واحدة
            if (user) {
                Object.assign(token, user);
            }
            // عند تبديل الفرع أو تحديث البروفايل
            if (trigger === "update" && session?.user) {
                const u = session.user as any;
                if (u.activeBranchId !== undefined) token.activeBranchId = u.activeBranchId;
                if (u.activeBranchName !== undefined) token.activeBranchName = u.activeBranchName;
                if (u.name) token.name = u.name;
                if (u.email) token.email = u.email;
                if (u.gender) token.gender = u.gender;
                if (u.avatar) token.avatar = u.avatar;
            }

            // مزامنة البيانات مع قاعدة البيانات عند الريفريش (JWT refresh)
            // مع إضافة cooldown لمدة 60 ثانية لتقليل الضغط على قاعدة البيانات
            const now = Date.now();
            const lastSync = (token.lastSync as number) || 0;
            const shouldSync = !user && token.id && (now - lastSync > 60000);

            if (shouldSync) {
                try {
                    const dbUser: any = await (prisma as any).user.findUnique({
                        where: { id: token.id },
                        select: {
                            role: true,
                            isSuperAdmin: true,
                            allowedBranches: true,
                            customRole: { select: { permissions: true } },
                            company: {
                                select: {
                                    isActive: true,
                                    name: true,
                                    businessType: true,
                                    subscription: true,
                                    branches: { where: { isActive: true }, orderBy: { isMain: 'desc' } }
                                }
                            }
                        }
                    });

                    if (dbUser) {
                        token.lastSync = now;
                        token.role = dbUser.role;
                        token.isSuperAdmin = !!dbUser.isSuperAdmin;
                        token.businessType = dbUser.company?.businessType || 'TRADING';

                        if (dbUser.customRole?.permissions) {
                            try { token.permissions = JSON.parse(dbUser.customRole.permissions); } catch { }
                        }

                        if (dbUser.company?.subscription) {
                            const sub = dbUser.company.subscription;
                            token.subscription = {
                                plan: sub.plan,
                                endDate: sub.endDate,
                                isActive: sub.isActive,
                                features: sub.features,
                                maxUsers: sub.maxUsers,
                                maxBranches: sub.maxBranches,
                                startDate: sub.startDate,
                            };
                        }

                        if (dbUser.company?.name) token.companyName = dbUser.company.name;
                        if (dbUser.company?.address) token.address = dbUser.company.address;

                        // تحديث الفروع تلقائياً لما تُضاف فروع جديدة
                        if (dbUser.company?.branches) {
                            token.branches = dbUser.company.branches.map((b: any) => ({
                                id: b.id, name: b.name, isMain: b.isMain
                            }));
                        }
                    }
                } catch (e) {
                    console.error("[AUTH_SYNC_ERROR]:", e);
                }
            }

            return token;
        },

        // الـ session callback يقرأ من التوكن فقط - صفر اتصالات بقاعدة البيانات
        async session({ session, token }: any) {
            if (session.user && token) {
                const u = session.user as any;
                u.id = token.id;
                // ضبط الاسم والإيميل صريحاً لضمان ظهورهم دايماً
                u.name = token.name || token.username || 'مستخدم';
                u.email = token.email;
                u.username = token.username;
                u.role = token.role;
                u.companyId = token.companyId;
                u.isSuperAdmin = token.isSuperAdmin;
                u.branchId = token.branchId;
                u.activeBranchId = token.activeBranchId;
                u.activeBranchName = token.activeBranchName;
                u.branches = token.branches || [];
                u.allowedBranches = token.allowedBranches;
                u.gender = token.gender || 'male';
                u.avatar = token.avatar || 'm1';
                u.permissions = token.permissions || {};
                u.currency = token.currency || 'EGP';
                u.companyName = token.companyName || '';
                u.companyLogo = token.companyLogo || '';
                u.taxNumber = token.taxNumber || '';
                u.commercialRegister = token.commercialRegister || '';
                u.phone = token.phone || '';
                u.address = token.address || '';
                u.businessType = token.businessType || 'TRADING';
                u.subscription = token.subscription || null;
            }
            return session;
        }
    },
    pages: {
        signIn: "/login",
    }
};
