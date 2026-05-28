# Déploiement — wtconnect-web (Cloudflare Pages)

1. Créer un projet Pages lié au repo GitHub `wtconnect-web`, branche `main`.
2. Build command : `npm run build`
3. Build output : `.next` (ou configurer `@cloudflare/next-on-pages` si vous gardez le même flux que l’ancien projet).
4. Variables d’environnement (production) :
   - `NEXT_PUBLIC_API_URL=https://api.[domaine]`
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (compte B)
5. Supabase Auth → Redirect URLs : `https://app.[domaine]/**`

## Local

```bash
cp .env.example .env.local
npm install
npm run dev
```

Worker en parallèle : `cd ../wtconnect-api && npm run dev` (port 8787 par défaut).
