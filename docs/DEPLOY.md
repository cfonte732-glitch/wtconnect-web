# Déploiement — wtconnect-web (Cloudflare Pages)

## Réglages dashboard (obligatoire)

| Champ | Valeur |
|--------|--------|
| **Build command** | `npm run pages:build` |
| **Build output directory** | *(laisser vide si `wrangler.toml` est détecté)* ou `.vercel/output/static` |
| **Deploy command** | *(vide — ne pas mettre `npx wrangler deploy`)* |

Le fichier `wrangler.toml` à la racine indique `pages_build_output_dir = ".vercel/output/static"`.

**Ne pas** publier le dossier `.next` : il contient des caches webpack > 25 Mo (erreur Pages).

## Variables d’environnement (production)

- `NEXT_PUBLIC_API_URL` — URL du Worker `wtconnect-api`
- `NEXT_PUBLIC_SUPABASE_URL` — projet Supabase B (auth)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key (auth uniquement)

Supabase Auth → Redirect URLs : `https://votre-app.pages.dev/**` et domaine custom.

## Local

```bash
cp .env.example .env.local
npm install
npm run dev
```

Build Pages local (optionnel) :

```bash
npm run pages:build
npx wrangler pages dev .vercel/output/static
```

Worker API en parallèle : `cd ../wtconnect-api && npm run dev`
