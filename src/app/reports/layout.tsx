import React from 'react';

// FORCE DYNAMIC: This ensures that ALL report pages (30+) are rendered dynamically 
// and NOT pre-rendered during the Vercel build. This fixes all "Failed to collect page data" 
// or "Prerender Error" caused by Prisma or searchParams in the reports directory.
export const dynamic = 'force-dynamic';

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

