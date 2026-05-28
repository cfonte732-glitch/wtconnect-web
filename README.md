# wtconnect-web

Interface WTConnect v2 — **Cloudflare Pages**, sans accès PostgREST métier depuis le navigateur.

- Login : Supabase Auth (`auth-client.ts`)
- Données : API Worker (`api-client.ts`)

```bash
npm install
cp .env.example .env.local
npm run dev
```

Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
