'use client';

import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { fetchConnectMessages } from '@/lib/api-client';
import { mapConnectMessageToCommandeRow, type MappedCommandeRow } from '@/lib/connect/commandes-map-row';
import { useTenantStore } from '@/stores/tenantStore';

function fmtDateTime(iso: string) {
  if (!iso) return '';
  try {
    return format(new Date(iso), 'dd/MM/yyyy HH:mm', { locale: fr });
  } catch {
    return iso;
  }
}

export function ConnectCommandesView() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const [rows, setRows] = useState<MappedCommandeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    if (!tenantId) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { items } = await fetchConnectMessages({ tenant_id: tenantId, limit: 200, q: q || undefined });
      const mapped = items.map((m) =>
        mapConnectMessageToCommandeRow(
          {
            id: m.id,
            created_at: m.created_at,
            status: m.status,
            num_cde: m.num_cde,
            payload_raw: m.payload_raw,
            payload_transformed: m.payload_transformed,
            errors: m.errors,
          },
          'received'
        )
      );
      setRows(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, q]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          Recherche
          <input
            className="ml-2 rounded border px-2 py-1"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="n° commande, id…"
          />
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded border px-3 py-1 text-sm hover:bg-slate-50"
        >
          Actualiser
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Chargement…</p>}

      <div className="overflow-x-auto rounded border">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-2 py-2">Date</th>
              <th className="px-2 py-2">Commande</th>
              <th className="px-2 py-2">Client</th>
              <th className="px-2 py-2">Statut</th>
              <th className="px-2 py-2">ID message</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.messageId} className="border-t hover:bg-slate-50">
                <td className="px-2 py-1 whitespace-nowrap">{fmtDateTime(r.messageCreatedAt)}</td>
                <td className="px-2 py-1">{r.commande || r.idWtConnect}</td>
                <td className="px-2 py-1">{r.client}</td>
                <td className="px-2 py-1">{r.status}</td>
                <td className="px-2 py-1 font-mono text-[10px]">{r.messageId.slice(0, 8)}…</td>
              </tr>
            ))}
            {!loading && !rows.length && (
              <tr>
                <td colSpan={5} className="px-2 py-6 text-center text-slate-500">
                  Aucun message
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-slate-500">
        Données via API Worker uniquement — pas d’appel PostgREST métier depuis le navigateur.
      </p>
    </div>
  );
}
