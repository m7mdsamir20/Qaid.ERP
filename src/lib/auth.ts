import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: AuthOptions = {
    adapter: (process.env.NEXT_PHASE === 'phase-production-build' || process.env.CI) 
        ? undefined 
        : PrismaAdapter(prisma) as any,
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

                // استخدام طريقة Prisma القياسية المتوافقة عالمياً (مع دعم تجاهل حالة الأحرف في PostgreSQL)
                const user: any = await (prisma as any).user.findFirst({
                    where: {
                        OR: [
                            { email: { equals: credentials.username, mode: 'insensitive' } },
                            { username: { equals: credentials.username, mode: 'insensitive' } }
                        ]
                    },
                    include: { company: true, customRole: true }
                });

                if (!user || !user.password) {
                    throw new Error("بيانات الدخول غير صحيحة");
                }

                if (user.status !== "active") {
                    throw new Error("عفواً، الحساب موقوف، يرجى مراجعة مدير النظام.");
                }

                if (!user.isPhoneVerified) {
                    throw new Error("برجاء تأكيد رقم الهاتف أولاً لإتمام التسجيل");
                }

                const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

                if (!isPasswordValid) {
                    throw new Error("كلمة المرور غير صحيحة");
                }

                // Verify company subscription if not superadmin
                if (user.role !== 'superadmin') {
                    if (!user.company) {
                        throw new Error("لا توجد شركة مرتبطة بهذا الحساب");
                    }
                    if (!user.company.isActive) {
                        throw new Error("اشتراك الشركة غير مفعل، يرجى مراجعة الإدارة");
                    }
                }

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    companyId: user.companyId,
                    branchId: user.branchId || null,
                    gender: (user as any).gender || 'male',
                    avatar: (user as any).avatar || 'm1',
                    customRole: user.customRole,
                    isSuperAdmin: user.isSuperAdmin // إضافة الصلاحية هنا
                };
            }
        })
    ],
    session: {
        strategy: "jwt"
    },
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.companyId = user.companyId;
                token.isSuperAdmin = (user as any).isSuperAdmin; // حفظ في التوكن
                token.branchId = (user as any).branchId || null;
                token.activeBranchId = (user as any).branchId || null;
                token.gender = (user as any).gender;
                token.avatar = (user as any).avatar;

                if ((user as any).customRole && (user as any).customRole.permissions) {
                    try {
                        token.permissions = JSON.parse((user as any).customRole.permissions);
                    } catch (e) {
                        token.permissions = {};
                    }
                }
            }

            // Handle session update trigger (branch switch + profile updates)
            if (trigger === "update" && session?.user) {
                if (session.user.name) token.name = session.user.name;
                if (session.user.email) token.email = session.user.email;
                if (session.user.gender) token.gender = session.user.gender;
                if (session.user.avatar) token.avatar = session.user.avatar;
                // تبديل الفرع النشط
                if ((session.user as any).activeBranchId !== undefined) {
                    token.activeBranchId = (session.user as any).activeBranchId;
                }
            }

            return token;
        },
        async session({ session, token }) {
            // SAFEGUARD: Skip DB calls during build to prevent Vercel "Failed to collect page data" errors
            const isBuild = process.env.NEXT_PHASE === 'phase-production-build' || process.env.CI;
            if (isBuild) return session;

            if (session.user && token.sub) {
                // جلب بيانات المستخدم - مع fallback لو branches غير موجودة بعد
                let user: any = null;
                try {
                    user = await (prisma as any).user.findUnique({
                        where: { id: token.sub },
                        include: {
                            company: {
                                include: {
                                    subscription: true,
                                    branches: { where: { isActive: true }, orderBy: { isMain: 'desc' } }
                                }
                            },
                            customRole: true
                        },
                    });
                } catch {
                    // fallback بدون branches لو الـ model لسه مش موجود
                    user = await (prisma as any).user.findUnique({
                        where: { id: token.sub },
                        include: {
                            company: { include: { subscription: true } },
                            customRole: true
                        },
                    });
                }

                if (user) {
                    (session.user as any).id = user.id;
                    (session.user as any).role = user.role;
                    (session.user as any).companyId = user.companyId;
                    (session.user as any).isSuperAdmin = user.isSuperAdmin;
                    (session.user as any).branchId = user.branchId || null;

                    // الفرع النشط: من token (لو بدّل) أو الافتراضي
                    const activeBranchId = (token as any).activeBranchId;
                    const branches: any[] = user.company?.branches || [];
                    const mainBranch = branches.find((b: any) => b.isMain) || branches[0];

                    if (activeBranchId === 'all') {
                        // Admin explicitly chose "كل الفروع"
                        (session.user as any).activeBranchId = null;
                        (session.user as any).activeBranchName = 'كل الفروع';
                    } else if (activeBranchId) {
                        (session.user as any).activeBranchId = activeBranchId;
                        const activeBranch = branches.find((b: any) => b.id === activeBranchId);
                        (session.user as any).activeBranchName = activeBranch?.name || 'الفرع الرئيسي';
                    } else if (user.branchId) {
                        (session.user as any).activeBranchId = user.branchId;
                        const userBranch = branches.find((b: any) => b.id === user.branchId);
                        (session.user as any).activeBranchName = userBranch?.name || 'الفرع الرئيسي';
                    } else if (branches.length > 0) {
                        // Default to main branch on first login
                        (session.user as any).activeBranchId = mainBranch?.id || null;
                        (session.user as any).activeBranchName = mainBranch?.name || 'الفرع الرئيسي';
                    } else {
                        (session.user as any).activeBranchId = null;
                        (session.user as any).activeBranchName = '';
                    }

                    (session.user as any).branches = branches.map((b: any) => ({
                        id: b.id, name: b.name, isMain: b.isMain
                    }));

                    // الفروع المسموح بها للمستخدم (null = كل الفروع)
                    const allowedBranchesRaw = (user as any).allowedBranches;
                    let allowedBranches: string[] | null = null;
                    if (allowedBranchesRaw) {
                        try { allowedBranches = JSON.parse(allowedBranchesRaw); } catch { }
                    }
                    (session.user as any).allowedBranches = allowedBranches;

                    if (user.customRole?.permissions) {
                        try {
                            (session.user as any).permissions = JSON.parse(user.customRole.permissions);
                        } catch {
                            (session.user as any).permissions = {};
                        }
                    } else {
                        (session.user as any).permissions = {};
                    }
                    (session.user as any).gender = (user as any).gender || 'male';
                    (session.user as any).avatar = (user as any).avatar || 'm1';
                    (session.user as any).currency = user.company?.currency || 'EGP';
                    (session.user as any).companyName = user.company?.name || '';
                    (session.user as any).companyLogo = user.company?.logo || '';
                    (session.user as any).taxNumber = user.company?.taxNumber || '';
                    (session.user as any).commercialRegister = user.company?.commercialRegister || '';
                    (session.user as any).phone = user.company?.phone || '';

                    if (user.company?.subscription) {
                        (session.user as any).subscription = {
                            plan: user.company.subscription.plan,
                            endDate: user.company.subscription.endDate,
                            isActive: user.company.subscription.isActive,
                            features: user.company.subscription.features,
                            maxUsers: user.company.subscription.maxUsers,
                            maxBranches: user.company.subscription.maxBranches,
                            startDate: user.company.subscription.startDate,
                        };
                    }
                    (session.user as any).businessType = user.company?.businessType || 'TRADING';
                }
            }
            return session;
        }
    },
    pages: {
        signIn: "/login",
    }
};
