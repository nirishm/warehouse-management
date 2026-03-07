import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NoTenantPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <h1 className="text-xl font-bold text-zinc-100">No Organization Found</h1>
        <p className="text-sm text-zinc-400 max-w-md">
          Your account is not associated with any organization yet.
          Contact your administrator to get invited.
        </p>
        <Link href="/login">
          <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            Back to sign in
          </Button>
        </Link>
      </div>
    </div>
  );
}
