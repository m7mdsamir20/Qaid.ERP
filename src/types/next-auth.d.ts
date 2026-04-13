import "next-auth";

interface SubscriptionInfo {
    plan?: string | null;
    isActive?: boolean | null;
    startDate?: string | Date | null;
    endDate?: string | Date | null;
    features?: string[] | string | null;
}

declare module "next-auth" {
    interface User {
        id: string;
        role: string;
        companyId?: string | null;
        isSuperAdmin?: boolean;
        permissions?: Record<string, unknown>;
        currency?: string | null;
        businessType?: string | null;
        subscription?: SubscriptionInfo | null;
        companyName?: string | null;
        companyLogo?: string | null;
        taxNumber?: string | null;
        activeBranchId?: string | null;
        allowedBranches?: string[] | null;
    }

    interface Session {
        user: User & {
            id: string;
            role: string;
            companyId?: string | null;
        };
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: string;
        companyId?: string | null;
        isSuperAdmin?: boolean;
        permissions?: Record<string, unknown>;
        currency?: string | null;
        businessType?: string | null;
        subscription?: SubscriptionInfo | null;
        companyName?: string | null;
        companyLogo?: string | null;
        taxNumber?: string | null;
        activeBranchId?: string | null;
        allowedBranches?: string[] | null;
    }
}
