import "next-auth";

declare module "next-auth" {
    interface User {
        id: string;
        role: string;
        companyId?: string | null;
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
    }
}
