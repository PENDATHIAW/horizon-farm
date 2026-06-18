# Tallow & Go

Site vitrine e-commerce pour **Tallow & Go** — cosmétiques naturels au suif.

Stack : React · Vite · Tailwind CSS · Supabase · Vercel (comme Horizon Farm).

## Démarrage rapide

```bash
npm install
cp .env.example .env.local   # renseigner Supabase
npm run dev
```

## Supabase

1. Créer un **nouveau projet** Supabase (séparé d'Horizon Farm).
2. Exécuter `supabase/schema.sql` dans l'éditeur SQL.
3. Copier l'URL et la clé `anon` dans `.env.local`.

## Déploiement Vercel

1. Importer le repo GitHub `pendathiaw/tallow-and-go`.
2. Framework : Vite (détecté automatiquement).
3. Ajouter les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.

## Structure

- `src/components/` — sections de la page d'accueil
- `src/data/products.js` — catalogue statique (en attendant Supabase)
- `supabase/schema.sql` — produits + newsletter

## Créer le repo GitHub

Si le dépôt n'existe pas encore :

```bash
gh repo create pendathiaw/tallow-and-go --public --source=. --remote=origin --push
```

Ou créer le repo manuellement sur GitHub, puis :

```bash
git remote add origin https://github.com/pendathiaw/tallow-and-go.git
git push -u origin main
```
