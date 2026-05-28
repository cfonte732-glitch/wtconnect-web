'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { signIn, loading } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error: err } = await signIn(email, password);
    if (err) {
      setError(err instanceof Error ? err.message : String(err));
      return;
    }
    router.push('/connect/commandes');
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto mt-16 max-w-md space-y-4 rounded-lg border bg-white p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">WTConnect</h1>
      <p className="text-sm text-slate-600">Connexion (Supabase Auth — phase 1)</p>
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <label className="block text-sm">
        E-mail
        <input
          type="email"
          className="mt-1 w-full rounded border px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label className="block text-sm">
        Mot de passe
        <input
          type="password"
          className="mt-1 w-full rounded border px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {loading ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  );
}
