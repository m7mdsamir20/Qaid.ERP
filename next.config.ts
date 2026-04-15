import type { NextConfig } from "next";

const securityHeaders = [
    { key: 'X-DNS-Prefetch-Control', value: 'on' },
    { key: 'X-XSS-Protection', value: '1; mode=block' },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    {
        key: 'Content-Security-Policy',
        value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline' vercel.live *.vercel.live",
            "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
            "font-src 'self' fonts.gstatic.com data:",
            "img-src 'self' data: blob: *",
            "connect-src 'self' vercel.live *.vercel.live",
            "frame-ancestors 'none'",
            "frame-src 'self' vercel.live *.vercel.live",
        ].join('; ')
    },
];

const nextConfig: NextConfig = {
    serverExternalPackages: ['@prisma/client', 'prisma'],

    // تسريع: ضغط الملفات
    compress: true,

    // تسريع: تحسين الصور
    images: {
        formats: ['image/avif', 'image/webp'],
    },

    async headers() {
        return [
            {
                source: '/(.*)',
                headers: securityHeaders,
            },
            // كاش للملفات الثابتة (JS, CSS, صور)
            {
                source: '/_next/static/(.*)',
                headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
            },
            // كاش للصور في public
            {
                source: '/(.*)\\.(png|jpg|jpeg|svg|ico|webp)',
                headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
            },
        ];
    },
};

export default nextConfig;
