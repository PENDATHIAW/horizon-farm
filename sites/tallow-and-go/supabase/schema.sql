-- Tallow & Go — Schéma initial Supabase
-- À exécuter dans l'éditeur SQL de votre projet Supabase

create extension if not exists "pgcrypto";

create table if not exists public.products (
  id text primary key,
  name text not null,
  tagline text,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  currency text not null default 'EUR',
  size text,
  badge text,
  benefits text[] default '{}',
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.newsletter_subscribers enable row level security;

create policy "Produits visibles publiquement"
  on public.products for select
  using (active = true);

create policy "Inscription newsletter publique"
  on public.newsletter_subscribers for insert
  with check (true);

-- Données de démonstration
insert into public.products (id, name, tagline, description, price, size, badge, benefits)
values
  (
    'baume-universel',
    'Baume Universel',
    'Nourrissant & réparateur',
    'Un baume riche au suif de bœuf grass-fed, infusé de calendula et de cire d''abeille locale.',
    18,
    '50 ml',
    'Best-seller',
    array['Peaux sèches', 'Lèvres & mains', 'Usage quotidien']
  ),
  (
    'creme-visage',
    'Crème Visage Douceur',
    'Texture légère, fini satiné',
    'Formule fluide pour le visage, enrichie en huile de jojoba et beurre de karité.',
    24,
    '30 ml',
    'Nouveau',
    array['Hydratation', 'Peaux sensibles', 'Matin & soir']
  ),
  (
    'savon-artisanal',
    'Savon Artisanal',
    'Saponification à froid',
    'Savon surgras au suif et à l''argile douce, sans parfum synthétique.',
    9,
    '100 g',
    null,
    array['Corps & visage', 'Peaux réactives', 'Fait main']
  ),
  (
    'stick-levres',
    'Stick Lèvres',
    'Format nomade',
    'Protection immédiate des lèvres gercées, texture fondante et discrète.',
    7,
    '5 g',
    null,
    array['Poche & sac', 'Enfants', 'Toute la famille']
  )
on conflict (id) do nothing;
