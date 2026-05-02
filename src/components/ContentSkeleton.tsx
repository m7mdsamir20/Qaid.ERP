import { C } from '@/constants/theme';

export default function ContentSkeleton() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', animation: 'fadeIn 0.3s ease' }}>
            <div className="skeleton-pulse" style={{ width: '30%', height: '40px', borderRadius: '12px', background: 'rgba(128,128,128,0.08)' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="skeleton-pulse" style={{ height: '140px', borderRadius: '24px', background: 'rgba(128,128,128,0.05)' }} />
                ))}
            </div>
            <div className="skeleton-pulse" style={{ width: '100%', height: '400px', borderRadius: '24px', background: 'rgba(128,128,128,0.05)' }} />
            <style jsx global>{`
                @keyframes pulse-shimmer {
                    0% { opacity: 0.5; }
                    50% { opacity: 0.8; }
                    100% { opacity: 0.5; }
                }
                .skeleton-pulse {
                    animation: pulse-shimmer 2s infinite ease-in-out;
                }
            `}</style>
        </div>
    );
}
