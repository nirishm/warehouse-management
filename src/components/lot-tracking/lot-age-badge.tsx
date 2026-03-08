'use client';

interface LotAgeBadgeProps {
  receivedDate: string;
  className?: string;
}

export function LotAgeBadge({ receivedDate, className = '' }: LotAgeBadgeProps) {
  const ageMs = Date.now() - new Date(receivedDate).getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

  let label: string;
  let colorClass: string;

  if (ageDays < 30) {
    label = `${ageDays}d`;
    colorClass = 'text-[var(--green)] bg-[var(--green-bg)]';
  } else if (ageDays < 90) {
    label = `${Math.floor(ageDays / 7)}w`;
    colorClass = 'text-[var(--accent-color)] bg-[var(--orange-bg)]';
  } else {
    const months = Math.floor(ageDays / 30);
    label = `${months}mo`;
    colorClass = 'text-[var(--red)] bg-[var(--red-bg)]';
  }

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-mono ${colorClass} ${className}`}
      title={`${ageDays} days since receipt`}
    >
      {label}
    </span>
  );
}
