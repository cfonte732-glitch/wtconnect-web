'use client';

import { useEffect, useState } from 'react';
import { fetchConnectTenants, type ConnectTenant } from '@/lib/api-client';
import { useTenantStore } from '@/stores/tenantStore';

export function TenantSelector() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const setTenantId = useTenantStore((s) => s.setTenantId);
  const [tenants, setTenants] = useState<ConnectTenant[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const { items } = await fetchConnectTenants();
        setTenants(items);
        if (!tenantId && items[0]) setTenantId(items[0].id);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur chargement tenants');
      }
    };
    void run();
  }, [tenantId, setTenantId]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!tenants.length) return <p className="text-sm text-amber-700">Aucun tenant Connect.</p>;

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-slate-600">Tenant</span>
      <select
        className="rounded border px-2 py-1"
        value={tenantId || ''}
        onChange={(e) => setTenantId(e.target.value || null)}
      >
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} ({t.role})
          </option>
        ))}
      </select>
    </label>
  );
}
