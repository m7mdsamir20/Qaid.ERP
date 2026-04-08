import { withAuth, NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req: NextRequestWithAuth) {
        const token = req.nextauth.token;
        const path = req.nextUrl.pathname;

        // لو مسجل دخول وفتح login أو register → روح للداشبورد
        if (token && (path === '/login' || path === '/register')) {
            return NextResponse.redirect(new URL('/', req.url));
        }

        // فحص الصلاحيات (Role-Based Access Control)
        if (token && !token.isSuperAdmin && path !== '/' && !path.startsWith('/api') && !path.startsWith('/login')) {
            const perms = (token.permissions as any) || {};
            // تحويل المسار لكود صفحة (مثلاً /sales/new -> /sales)
            const basePage = '/' + path.split('/')[1];

            // استثناءات الصفحات العامة بعد تسجيل الدخول
            const publicPages = ['/profile', '/notifications', '/support', '/settings']; 
            if (publicPages.includes(basePage)) return NextResponse.next();

            // فحص الصلاحية
            if (perms[basePage] && !perms[basePage].view) {
                return NextResponse.redirect(new URL('/unauthorized', req.url));
            }
        }

        return NextResponse.next();
    },
    {
        pages: {
            signIn: "/login",
        },
        callbacks: {
            authorized: ({ token, req }) => {
                const path = req.nextUrl.pathname;
                // صفحات مفتوحة للكل
                if (path === '/login' || path === '/register' || path === '/verify') {
                    return true;
                }
                // مكرر: تحديث البيانات مع قاعدة البيانات عند كل ريفريش لضمان تفعيل الصلاحيات فوراً
                // بدون cooldown (0 ثانية) بناءً على طلب المستخدم لضمان الاستجابة اللحظية
                return !!token;
            }
        }
    }
);

export const config = {
    matcher: [
        "/((?!api/auth|_next/static|_next/image|favicon.ico|logo-system|uploads).*)",
    ],
};
