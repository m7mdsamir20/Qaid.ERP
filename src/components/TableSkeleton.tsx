import { C } from '@/constants/theme';

export default function TableSkeleton() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', animation: 'fadeIn 0.3s ease', marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div className="skeleton-pulse" style={{ width: '200px', height: '40px', borderRadius: '12px', background: 'rgba(128,128,128,0.08)' }} />
                <div className="skeleton-pulse" style={{ width: '120px', height: '40px', borderRadius: '12px', background: 'rgba(128,128,128,0.08)' }} />
            </div>
            <div className="skeleton-pulse" style={{ width: '100%', height: '50px', borderRadius: '12px', background: 'rgba(128,128,128,0.08)' }} />
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton-pulse" style={{ width: '100%', height: '60px', borderRadius: '12px', background: 'rgba(128,128,128,0.04)' }} />
            ))}
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
