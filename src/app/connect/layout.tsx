'use client';

import Link from 'next/link';
import { ConnectGuard } from '@/components/auth/ConnectGuard';
import { TenantSelector } from '@/components/connect/TenantSelector';
import { useAuth } from '@/hooks/use-auth';

export default function ConnectLayout({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth();

  return (
    <ConnectGuard>
      <div className="min-h-screen">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b bg-white px-6 py-3">
          <div className="flex items-center gap-6">
            <span className="font-semibold">WTConnect</span>
            <nav className="flex gap-4 text-sm">
              <Link href="/connect/commandes" className="text-slate-700 hover:underline">
                Commandes
              </Link>
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <TenantSelector />
            <span className="text-xs text-slate-500">{user?.email}</span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="text-sm text-slate-600 hover:underline"
            >
              Déconnexion
            </button>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </ConnectGuard>
  );
}
