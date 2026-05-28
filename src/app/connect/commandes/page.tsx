import { ConnectCommandesView } from '@/components/connect/ConnectCommandesView';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default function CommandesPage() {
  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Commandes Connect</h1>
      <ConnectCommandesView />
    </div>
  );
}
