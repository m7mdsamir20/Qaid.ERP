'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * This page has been merged with the KDS page.
 * Redirecting to /kds automatically.
 */
export default function KitchenRedirect() {
    const router = useRouter();
    useEffect(() => { router.replace('/kds'); }, [router]);
    return null;
}
