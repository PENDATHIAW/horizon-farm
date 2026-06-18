# Tallow & Go

Site vitrine e-commerce pour **Tallow & Go** — cosmétiques au suif purifié, issu des embouches bovines du projet d'élevage, formulés au Sénégal.

**Stack :** React · Vite · Tailwind CSS · Supabase · Vercel

## Démarrage local

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Créer le dépôt GitHub

Le token Cloud Agent ne peut pas créer de repo. Depuis ce dossier, avec **vos** identifiants :

```bash
chmod +x scripts/bootstrap-github.sh
./scripts/bootstrap-github.sh PENDATHIAW
```

Ou manuellement :

1. Créer un repo vide `tallow-and-go` sur GitHub
2. `git init -b main && git add -A && git commit -m "Initial commit"`
3. `git remote add origin https://github.com/PENDATHIAW/tallow-and-go.git`
4. `git push -u origin main`

## Supabase

1. Créer un **nouveau projet** Supabase (séparé d'Horizon Farm)
2. Exécuter `supabase/schema.sql`
3. Variables : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Vercel

1. Importer le repo `tallow-and-go`
2. Framework : Vite (auto-détecté)
3. Ajouter les variables d'environnement Supabase

## Structure

```
src/components/   # Header, Hero, Products, BenefitsBar…
src/data/         # Catalogue produits + chaîne de valeur
supabase/         # Schéma SQL
public/           # Assets (logo, visuel gamme)
```

## Prochaines étapes

- [ ] Photos packaging haute résolution
- [ ] Connexion catalogue Supabase dynamique
- [ ] Commande WhatsApp / panier / paiement
