#!/usr/bin/env node
/**
 * Applique les migrations SQL Supabase (202606*.sql) sur le projet distant.
 *
 * Méthodes (par ordre de priorité) :
 * 1. SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF → API Management Supabase
 * 2. DATABASE_URL / SUPABASE_DB_URL → connexion PostgreSQL directe (pg)
 *
 * Usage: node scripts/apply_supabase_migrations.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = join(root, 'supabase/migrations');
const projectRef = process.env.SUPABASE_PROJECT_REF || 'xmqfvmswrjhteaijnaxb';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || `https://${projectRef}.supabase.co`).replace(/\/$/, '');

function migrationFiles() {
  return readdirSync(migrationsDir)
    .filter((name) => /^202606/.test(name) && name.endsWith('.sql'))
    .sort()
    .map((name) => join(migrationsDir, name));
}

async function verifyRemote() {
  const checks = [
    { label: 'push_subscriptions', url: `${supabaseUrl}/rest/v1/push_subscriptions?select=id&limit=1` },
    { label: 'push_status', url: `${supabaseUrl}/rest/v1/alertes_center?select=push_status&limit=1` },
    { label: 'stock_movements', url: `${supabaseUrl}/rest/v1/stock_movements?select=id&limit=1` },
    { label: 'module_role_permissions', url: `${supabaseUrl}/rest/v1/module_role_permissions?select=id&limit=1` },
  ];
  const results = {};
  for (const check of checks) {
    const res = await fetch(check.url, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    }).catch(() => null);
    results[check.label] = res?.ok ? 'ok' : `missing (${res?.status || 'network'})`;
  }
  return results;
}

async function applyViaManagementApi(token, files) {
  for (const file of files) {
    const sql = readFileSync(file, 'utf8');
    const name = file.split('/').pop();
    process.stdout.write(`→ ${name} ... `);
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`${name}: HTTP ${res.status} — ${JSON.stringify(body)}`);
    }
    console.log('OK');
  }
}

async function applyViaPg(connectionString, files) {
  const { default: pg } = await import('pg');
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    for (const file of files) {
      const sql = readFileSync(file, 'utf8');
      const name = file.split('/').pop();
      process.stdout.write(`→ ${name} ... `);
      await client.query(sql);
      console.log('OK');
    }
  } finally {
    await client.end();
  }
}

function buildDbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  const password = process.env.SUPABASE_DB_PASSWORD || process.env.POSTGRES_PASSWORD;
  if (!password) return null;
  const host = process.env.SUPABASE_DB_HOST || `db.${projectRef}.supabase.co`;
  const port = process.env.SUPABASE_DB_PORT || '5432';
  const user = process.env.SUPABASE_DB_USER || 'postgres';
  const db = process.env.SUPABASE_DB_NAME || 'postgres';
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}`;
}

async function main() {
  const files = migrationFiles();
  if (!files.length) {
    console.log('Aucune migration 202606*.sql trouvée.');
    process.exit(0);
  }

  console.log(`Migrations à appliquer (${files.length}) :`);
  files.forEach((f) => console.log(`  - ${f.split('/').pop()}`));

  if (anonKey) {
    console.log('\nÉtat avant migration :');
    console.log(await verifyRemote());
  }

  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  const dbUrl = buildDbUrl();

  if (accessToken) {
    console.log('\nApplication via Supabase Management API...');
    await applyViaManagementApi(accessToken, files);
  } else if (dbUrl) {
    console.log('\nApplication via PostgreSQL...');
    await applyViaPg(dbUrl, files);
  } else {
    console.error(`
Impossible d'appliquer les migrations : credentials manquants.

Ajoutez l'une de ces variables dans Cursor → Cloud Agent → Secrets, puis relancez :

  SUPABASE_ACCESS_TOKEN=sbp_...   (https://supabase.com/dashboard/account/tokens)
  SUPABASE_PROJECT_REF=${projectRef}

OU

  SUPABASE_DB_PASSWORD=<mot de passe DB>
  (Settings → Database → Connection string → mot de passe postgres)

OU directement :

  DATABASE_URL=postgresql://postgres:PASSWORD@db.${projectRef}.supabase.co:5432/postgres
`);
    process.exit(1);
  }

  if (anonKey) {
    console.log('\nÉtat après migration :');
    console.log(await verifyRemote());
  }
  console.log('\nMigrations appliquées avec succès.');
}

main().catch((error) => {
  console.error('\nÉchec migration:', error.message || error);
  process.exit(1);
});
