#!/usr/bin/env node
/**
 * Vérifie si ai_recommendations existe et affiche les instructions de migration.
 * Usage: node scripts/apply-ai-recommendations-migration.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(root, '../supabase/migrations/20260529120000_create_ai_recommendations.sql');
const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://xmqfvmswrjhteaijnaxb.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const check = await fetch(`${url.replace(/\/$/, '')}/rest/v1/ai_recommendations?select=id&limit=1`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
}).catch(() => null);

if (check?.ok) {
  console.log('OK — table ai_recommendations déjà présente.');
  process.exit(0);
}

console.log('Table ai_recommendations absente (HTTP', check?.status || 'network error', ').');
console.log('');
console.log('Appliquer la migration manuellement :');
console.log('1. Supabase Dashboard → SQL Editor → New query');
console.log('2. Coller le contenu de:', sqlPath);
console.log('3. Run');
console.log('');
console.log('--- SQL ---');
console.log(readFileSync(sqlPath, 'utf8'));
