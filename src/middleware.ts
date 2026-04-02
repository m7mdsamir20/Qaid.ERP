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
                // باقي الصفحات محتاجة token
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
