import { headers } from 'next/headers';

export default async function NoTenantPage() {
  const headersList = await headers();
  const userEmail = headersList.get('x-user-email') ?? '';

  return (
    <div className="text-center">
      <div
        className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
        style={{ background: 'var(--accent-tint)' }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent-color)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h2 style={{ color: 'var(--text-primary)' }} className="text-[20px] font-bold mb-2">
        Access Pending
      </h2>
      <p style={{ color: 'var(--text-muted)' }} className="text-[14px] mb-4">
        Your account ({userEmail}) has been created, but you don&apos;t have access to any
        workspace yet.
      </p>
      <p style={{ color: 'var(--text-dim)' }} className="text-[13px]">
        An administrator will review your request and grant access shortly.
      </p>
    </div>
  );
}
