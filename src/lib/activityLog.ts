import { prisma } from './prisma';

interface LogParams {
    userId?: string;
    userName?: string;
    action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'approve' | 'reject' | 'print' | 'export' | 'receive';
    module: string;
    entityType?: string;
    entityId?: string;
    entityRef?: string;
    description: string;
    oldData?: any;
    newData?: any;
    ipAddress?: string;
    userAgent?: string;
    companyId?: string;
    branchId?: string;
}

export async function logActivity(params: LogParams) {
    try {
        await prisma.activityLog.create({
            data: {
                userId: params.userId,
                userName: params.userName,
                action: params.action,
                module: params.module,
                entityType: params.entityType,
                entityId: params.entityId,
                entityRef: params.entityRef,
                description: params.description,
                oldData: params.oldData ? params.oldData : undefined,
                newData: params.newData ? params.newData : undefined,
                ipAddress: params.ipAddress,
                userAgent: params.userAgent,
                companyId: params.companyId,
                branchId: params.branchId,
            },
        });
    } catch {
        // Logging should never break the main operation
    }
}

export function extractLogContext(session: any, request?: Request) {
    const user = session?.user as any;
    return {
        userId: user?.id,
        userName: user?.name,
        companyId: user?.companyId,
        branchId: user?.activeBranchId !== 'all' ? user?.activeBranchId : undefined,
        ipAddress: request ? (request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined) : undefined,
        userAgent: request ? (request.headers.get('user-agent') || undefined) : undefined,
    };
}
