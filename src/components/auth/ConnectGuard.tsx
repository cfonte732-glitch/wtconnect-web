'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authSupabase } from '@/lib/auth-client';
import { fetchAuthSession } from '@/lib/api-client';

export function ConnectGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const run = async () => {
      const { data } = await authSupabase.auth.getSession();
      if (!data.session) {
        router.replace('/login');
        return;
      }
      try {
        await fetchAuthSession();
        setReady(true);
      } catch {
        router.replace('/login');
      }
    };
    void run();
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600">
        Chargement…
      </div>
    );
  }

  return <>{children}</>;
}
