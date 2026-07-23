#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { request as httpsRequest } from 'node:https';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOMAIN_CHECKS, SMARTFARM_EXPECTATIONS } from './rls/rlsRoleMatrix.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = join(root, 'supabase/migrations');
const projectRef = process.env.SUPABASE_PROJECT_REF || 'xmqfvmswrjhteaijnaxb';
const expectedProjectName = process.env.SUPABASE_EXPECTED_PROJECT_NAME || process.env.SUPABASE_EXPECTED_PROJECT || 'HORIZON FARM';
const accessToken = process.env.SUPABASE_ACCESS_TOKEN || '';
const apiIp = process.env.SUPABASE_API_IP || '';
const projectApiIp = process.env.SUPABASE_PROJECT_API_IP || '';
const projectHost = `${projectRef}.supabase.co`;
const action = process.argv[2] || 'status';
const requestedFiles = process.argv.slice(3);
const MULTI_FARM_MIGRATION = '20260606120000_multi_farm_foundations.sql';
const FARM_RLS_MIGRATION = '20260713120000_farm_id_rls_all_business_tables.sql';
const FARM_RLS_VERIFICATION = join(root, 'supabase/verify_farm_id_rls.sql');
const ERP_ROLES = Object.freeze([
  'promotrice_direction',
  'responsable_filiere',
  'terrain',
  'finance',
  'veterinaire',
  'maintenance',
  'financeur_externe',
  'admin_support',
]);

if (!accessToken) {
  throw new Error('SUPABASE_ACCESS_TOKEN manquant.');
}

const sleep = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

async function fetchWithRetry(url, options = {}) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await fetch(url, options);
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(1000 * (2 ** attempt));
    }
  }
  throw new Error(`Réseau Supabase indisponible après 4 tentatives : ${lastError?.message || lastError}`);
}

function requestWithPinnedIp(path, options = {}) {
  return new Promise((resolveRequest, rejectRequest) => {
    const request = httpsRequest({
      hostname: apiIp,
      port: 443,
      servername: 'api.supabase.com',
      path: `/v1${path}`,
      method: options.method || 'GET',
      headers: { Host: 'api.supabase.com', ...(options.headers || {}) },
    }, (response) => {
      let raw = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { raw += chunk; });
      response.on('end', () => {
        let body = {};
        try { body = raw ? JSON.parse(raw) : {}; } catch { body = { message: raw }; }
        if ((response.statusCode || 500) >= 400) {
          rejectRequest(new Error(`Supabase HTTP ${response.statusCode}: ${body.message || raw}`));
          return;
        }
        resolveRequest(body);
      });
    });
    request.on('error', rejectRequest);
    if (options.body) request.write(options.body);
    request.end();
  });
}

async function managementRequest(path, options = {}) {
  const requestOptions = {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  };
  if (apiIp) return requestWithPinnedIp(path, requestOptions);
  const response = await fetchWithRetry(`https://api.supabase.com/v1${path}`, requestOptions);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Supabase HTTP ${response.status}: ${body.message || JSON.stringify(body)}`);
  }
  return body;
}

function requestProjectWithPinnedIp(address, path, options = {}) {
  return new Promise((resolveRequest, rejectRequest) => {
    const request = httpsRequest({
      hostname: address,
      port: 443,
      servername: projectHost,
      path,
      method: options.method || 'GET',
      headers: { Host: projectHost, ...(options.headers || {}) },
    }, (response) => {
      let raw = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { raw += chunk; });
      response.on('end', () => {
        let body = null;
        try { body = raw ? JSON.parse(raw) : null; } catch { body = raw; }
        resolveRequest({ status: response.statusCode || 500, body });
      });
    });
    request.on('error', rejectRequest);
    if (options.body) request.write(options.body);
    request.end();
  });
}

let resolvedProjectAddresses;

function resolveWithGoogleDoh(hostname) {
  return new Promise((resolveRequest, rejectRequest) => {
    const request = httpsRequest({
      hostname: '8.8.8.8',
      port: 443,
      servername: 'dns.google',
      path: `/resolve?name=${encodeURIComponent(hostname)}&type=A`,
      headers: { Host: 'dns.google', Accept: 'application/dns-json' },
    }, (response) => {
      let raw = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { raw += chunk; });
      response.on('end', () => {
        try {
          const body = JSON.parse(raw);
          const addresses = (body.Answer || [])
            .filter((answer) => answer.type === 1)
            .map((answer) => answer.data);
          if (!addresses.length) throw new Error('aucune adresse IPv4 retournee');
          resolveRequest(addresses);
        } catch (error) {
          rejectRequest(new Error(`Resolution DNS impossible pour ${hostname}: ${error.message}`));
        }
      });
    });
    request.on('error', rejectRequest);
    request.end();
  });
}

async function getProjectAddresses() {
  if (resolvedProjectAddresses) return resolvedProjectAddresses;
  resolvedProjectAddresses = projectApiIp ? [projectApiIp] : await resolveWithGoogleDoh(projectHost);
  return resolvedProjectAddresses;
}

async function projectRequest(path, options = {}) {
  const addresses = await getProjectAddresses();
  let lastError;
  for (const address of addresses) {
    try {
      return await requestProjectWithPinnedIp(address, path, options);
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`API projet Supabase indisponible: ${lastError?.message || lastError}`);
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function assertUuid(value, label) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''))) {
    throw new Error(`${label} invalide.`);
  }
  return value;
}

function projectHeaders(apiKey, accessJwt = apiKey) {
  return {
    apikey: apiKey,
    Authorization: `Bearer ${accessJwt}`,
    'Content-Type': 'application/json',
  };
}

function responseMessage(response) {
  if (typeof response.body === 'string') return response.body;
  return response.body?.message || response.body?.msg || response.body?.error_description || JSON.stringify(response.body);
}

function requireProjectOk(response, operation) {
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`${operation} refusee (HTTP ${response.status}): ${responseMessage(response)}`);
  }
  return response.body;
}

async function runSql(sql) {
  return managementRequest(`/projects/${projectRef}/database/query`, {
    method: 'POST',
    body: JSON.stringify({ query: sql }),
  });
}

async function assertProjectIdentity() {
  const project = await managementRequest(`/projects/${projectRef}`);
  if (project.ref !== projectRef || project.name !== expectedProjectName) {
    throw new Error(`Projet refuse: ${project.name || project.ref}. Projet attendu: ${expectedProjectName}.`);
  }
  if (project.status !== 'ACTIVE_HEALTHY') throw new Error(`Projet ${expectedProjectName} non sain: ${project.status || 'inconnu'}.`);
  console.log(`Projet confirme: ${project.name} (${project.ref}, ${project.status}, ${project.region})`);
}

async function assertMultiFarmPrerequisites() {
  const rows = await runSql(`
    select
      to_regclass('public.companies') is not null as companies,
      to_regclass('public.profiles') is not null as profiles,
      to_regclass('public.animals') is not null as animals,
      to_regclass('public.lots') is not null as lots,
      to_regclass('public.stocks') is not null as stocks,
      to_regclass('public.sales_orders') is not null as sales_orders,
      to_regclass('public.finances') is not null as finances,
      to_regclass('public.cultures') is not null as cultures,
      to_regclass('public.business_events') is not null as business_events,
      to_regprocedure('public.current_profile_role()') is not null as current_profile_role,
      to_regprocedure('public.current_company_id()') is not null as current_company_id,
      to_regprocedure('public.can_read_erp()') is not null as can_read_erp,
      to_regprocedure('public.can_write_erp()') is not null as can_write_erp,
      to_regprocedure('public.can_admin_erp()') is not null as can_admin_erp
  `);
  const missing = Object.entries(rows?.[0] || {}).filter(([, exists]) => !exists).map(([name]) => name);
  if (missing.length) throw new Error(`Prerequis de la fondation multi-fermes absents: ${missing.join(', ')}.`);
}

async function assertFarmRlsPrerequisites() {
  const rows = await runSql(`
    select
      to_regclass('public.companies') is not null as companies,
      to_regclass('public.farms') is not null as farms,
      to_regclass('public.user_farm_access') is not null as user_farm_access,
      to_regprocedure('public.can_read_farm(uuid)') is not null as can_read_farm,
      to_regprocedure('public.can_write_farm(uuid)') is not null as can_write_farm
  `);
  const missing = Object.entries(rows?.[0] || {}).filter(([, exists]) => !exists).map(([name]) => name);
  if (missing.length) throw new Error(`Prerequis farm_id/RLS absents: ${missing.join(', ')}.`);
}

async function verifyFarmRls() {
  const rows = await runSql(readFileSync(FARM_RLS_VERIFICATION, 'utf8'));
  if (!Array.isArray(rows) || rows.length) {
    throw new Error(`Verification farm_id/RLS en echec: ${JSON.stringify(rows)}`);
  }
  console.log('Verification farm_id/RLS: 0 table metier en defaut.');
}

function resolveSqlFile(file, { migrationOnly = false } = {}) {
  const absolute = isAbsolute(file) ? resolve(file) : resolve(root, file);
  const relativeToRoot = relative(root, absolute);
  if (relativeToRoot.startsWith('..') || !absolute.endsWith('.sql')) {
    throw new Error(`Fichier SQL hors depot refuse: ${file}`);
  }
  if (migrationOnly && relative(migrationsDir, absolute).startsWith('..')) {
    throw new Error(`Migration hors supabase/migrations refusee: ${file}`);
  }
  return absolute;
}

function listSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(path);
    return /\.(?:js|jsx|mjs)$/.test(entry.name) ? [path] : [];
  });
}

async function getAppliedVersions() {
  const table = await runSql("select to_regclass('supabase_migrations.schema_migrations')::text as history_table");
  if (!table?.[0]?.history_table) return new Set();
  const rows = await runSql('select version from supabase_migrations.schema_migrations order by version');
  return new Set((rows || []).map((row) => String(row.version)));
}

async function recordMigration(file) {
  const filename = basename(file, '.sql');
  const separator = filename.indexOf('_');
  const version = separator === -1 ? filename : filename.slice(0, separator);
  const name = separator === -1 ? filename : filename.slice(separator + 1);
  const escapeLiteral = (value) => String(value).replaceAll("'", "''");
  await runSql(`
    create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (
      version text primary key,
      statements text[] not null default array[]::text[],
      name text
    );
    alter table supabase_migrations.schema_migrations add column if not exists statements text[] not null default array[]::text[];
    alter table supabase_migrations.schema_migrations add column if not exists name text;
    insert into supabase_migrations.schema_migrations (version, statements, name)
    values ('${escapeLiteral(version)}', array[]::text[], '${escapeLiteral(name)}')
    on conflict (version) do update set name = excluded.name;
  `);
}

const statusSql = `
with required(name) as (
  values
    ('companies'),('farms'),('user_farm_access'),('profiles'),('module_role_permissions'),
    ('farm_rh_directory'),('planning_simulations'),('feed_facility_zones'),
    ('feed_raw_materials'),('feed_formulas'),('feed_production_orders'),
    ('funding_opportunities'),('animals'),('lots'),('clients'),('sales_orders'),
    ('stocks'),('transactions'),('cultures'),('tasks'),('documents'),('equipment'),
    ('business_events')
)
select
  r.name,
  to_regclass('public.' || r.name) is not null as exists,
  exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'public' and c.table_name = r.name
      and c.column_name = 'farm_id' and c.udt_name = 'uuid'
  ) as farm_id_uuid,
  exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'public' and c.table_name = r.name
      and c.column_name = 'farm_id' and c.is_nullable = 'NO'
  ) as farm_id_required,
  exists (
    select 1
    from pg_index i
    join pg_attribute a
      on a.attrelid = i.indrelid
     and a.attnum = any(i.indkey)
    where i.indrelid = to_regclass('public.' || r.name)
      and a.attname = 'farm_id'
  ) as farm_id_indexed,
  coalesce((
    select cl.relrowsecurity
    from pg_class cl
    join pg_namespace n on n.oid = cl.relnamespace
    where n.nspname = 'public' and cl.relname = r.name
  ), false) as rls
from required r
order by r.name;
`;

function getFarmRlsTableNames() {
  const migration = readFileSync(join(migrationsDir, FARM_RLS_MIGRATION), 'utf8');
  const block = migration.match(/metier text\[\] := array\[([\s\S]*?)\n\s*\];/)?.[1] || '';
  const names = [...block.matchAll(/'([a-z][a-z0-9_]*)'/g)].map((match) => match[1]);
  if (!names.length || new Set(names).size !== names.length) {
    throw new Error('Liste des tables metier introuvable ou dupliquee dans la migration farm_id/RLS.');
  }
  return names;
}

function farmRlsMatrixSql() {
  const values = getFarmRlsTableNames().map((name) => `('${name}')`).join(',');
  return `
    with tables_metier(nom) as (values ${values})
    select
      tm.nom as table_metier,
      to_regclass('public.' || tm.nom) is not null as existe,
      exists (
        select 1 from information_schema.columns c
        where c.table_schema = 'public' and c.table_name = tm.nom
          and c.column_name = 'farm_id' and c.udt_name = 'uuid'
      ) as farm_id_uuid,
      exists (
        select 1 from information_schema.columns c
        where c.table_schema = 'public' and c.table_name = tm.nom
          and c.column_name = 'farm_id' and c.is_nullable = 'NO'
      ) as farm_id_obligatoire,
      exists (
        select 1 from pg_index i
        join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
        where i.indrelid = to_regclass('public.' || tm.nom) and a.attname = 'farm_id'
      ) as index_farm_id,
      exists (
        select 1 from pg_constraint con
        where con.conrelid = to_regclass('public.' || tm.nom)
          and con.confrelid = to_regclass('public.farms') and con.contype = 'f'
      ) as fk_ferme,
      coalesce((
        select cl.relrowsecurity from pg_class cl
        join pg_namespace n on n.oid = cl.relnamespace
        where n.nspname = 'public' and cl.relname = tm.nom
      ), false) as rls_active,
      coalesce((
        select cl.relforcerowsecurity from pg_class cl
        join pg_namespace n on n.oid = cl.relnamespace
        where n.nspname = 'public' and cl.relname = tm.nom
      ), false) as rls_forcee,
      has_table_privilege('authenticated', 'public.' || tm.nom, 'SELECT')
        and has_table_privilege('authenticated', 'public.' || tm.nom, 'INSERT')
        and has_table_privilege('authenticated', 'public.' || tm.nom, 'UPDATE')
        and has_table_privilege('authenticated', 'public.' || tm.nom, 'DELETE')
        as droits_authenticated,
      exists (
        select 1 from pg_policies p
        where p.schemaname = 'public' and p.tablename = tm.nom
          and p.policyname = tm.nom || '_farm_read' and p.cmd = 'SELECT'
          and coalesce(p.qual, '') like '%is_deleted%'
      ) as politique_lecture,
      exists (
        select 1 from pg_policies p
        where p.schemaname = 'public' and p.tablename = tm.nom
          and p.policyname = tm.nom || '_farm_insert' and p.cmd = 'INSERT'
      ) as politique_insertion,
      exists (
        select 1 from pg_policies p
        where p.schemaname = 'public' and p.tablename = tm.nom
          and p.policyname = tm.nom || '_farm_update' and p.cmd = 'UPDATE'
      ) as politique_modification,
      exists (
        select 1 from pg_policies p
        where p.schemaname = 'public' and p.tablename = tm.nom
          and p.policyname = tm.nom || '_farm_delete' and p.cmd = 'DELETE'
      ) as politique_suppression,
      (
        select count(*) = 3 from information_schema.columns c
        where c.table_schema = 'public' and c.table_name = tm.nom
          and c.column_name in ('is_deleted', 'deleted_at', 'deleted_by')
      ) as suppression_logique_locale
    from tables_metier tm
    order by tm.nom;
  `;
}

async function loadProjectApiKeys() {
  const keys = await managementRequest(`/projects/${projectRef}/api-keys`);
  const anonKey = keys.find((key) => key.name === 'anon' && key.type === 'legacy')?.api_key;
  const serviceKey = keys.find((key) => key.name === 'service_role' && key.type === 'legacy')?.api_key;
  if (!anonKey || !serviceKey) throw new Error('Cles API anon/service_role introuvables pour le projet confirme.');
  return { anonKey, serviceKey };
}

async function createIsolationUser({ role, companyId, marker, serviceKey }) {
  const password = `Hf!${randomUUID()}A7`;
  const email = `${marker}-${role}@example.com`;
  const response = await projectRequest('/auth/v1/admin/users', {
    method: 'POST',
    headers: projectHeaders(serviceKey),
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: `Controle RLS ${role}`,
        role,
        status: 'active',
        company_id: companyId,
      },
    }),
  });
  const body = requireProjectOk(response, `Creation du compte temporaire ${role}`);
  const id = assertUuid(body?.id || body?.user?.id, `Identifiant Auth ${role}`);
  return { id, role, email, password };
}

async function signInIsolationUser(user, anonKey) {
  const response = await projectRequest('/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: projectHeaders(anonKey),
    body: JSON.stringify({ email: user.email, password: user.password }),
  });
  const body = requireProjectOk(response, `Connexion du role ${user.role}`);
  if (!body?.access_token) throw new Error(`Jeton Auth absent pour le role ${user.role}.`);
  return body.access_token;
}

async function deleteIsolationUser(userId, serviceKey) {
  const response = await projectRequest(`/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: projectHeaders(serviceKey),
  });
  if (response.status !== 404) requireProjectOk(response, 'Suppression du compte temporaire');
}

async function restAsUser(path, token, anonKey, options = {}) {
  return projectRequest(`/rest/v1${path}`, {
    ...options,
    headers: {
      ...projectHeaders(anonKey, token),
      ...(options.headers || {}),
    },
  });
}

async function rpcBoolean(functionName, args, token, anonKey) {
  const response = await restAsUser(`/rpc/${functionName}`, token, anonKey, {
    method: 'POST',
    body: JSON.stringify(args),
  });
  const body = requireProjectOk(response, `RPC ${functionName}`);
  if (typeof body !== 'boolean') throw new Error(`RPC ${functionName}: booleen attendu.`);
  return body;
}

async function verifyRoleIsolation() {
  const marker = `codex-rls-${randomUUID().replaceAll('-', '').slice(0, 16)}`;
  const users = [];
  const farms = [];
  let keys;
  let assertions = 0;
  let primaryError;
  const check = (condition, label) => {
    assertions += 1;
    if (!condition) throw new Error(`Isolation RLS invalide: ${label}.`);
  };

  try {
    keys = await loadProjectApiKeys();
    const companyRows = await runSql(`
      select id
      from public.companies
      where status = 'active'
      order by created_at asc
      limit 1;
    `);
    const companyId = assertUuid(companyRows?.[0]?.id, 'Societe de controle');
    const farmRows = await runSql(`
      insert into public.farms (company_id, name, country, status, is_default, settings)
      values
        (${sqlLiteral(companyId)}::uuid, ${sqlLiteral(`${marker}-ferme-a`)}, 'SN', 'active', false, '{"test_rls":true}'::jsonb),
        (${sqlLiteral(companyId)}::uuid, ${sqlLiteral(`${marker}-ferme-b`)}, 'SN', 'active', false, '{"test_rls":true}'::jsonb)
      returning id, name;
    `);
    for (const row of [...(farmRows || [])].sort((left, right) => left.name.localeCompare(right.name))) {
      farms.push(assertUuid(row.id, 'Ferme temporaire'));
    }
    if (farms.length !== 2) throw new Error('Creation des deux fermes temporaires incomplete.');
    const [farmA, farmB] = farms;

    for (const role of ERP_ROLES) {
      users.push(await createIsolationUser({ role, companyId, marker, serviceKey: keys.serviceKey }));
    }

    const roleRowsSql = users
      .map((user) => `(${sqlLiteral(user.id)}::uuid, ${sqlLiteral(user.role)})`)
      .join(',\n');
    await runSql(`
      update public.profiles profile
      set role = role_data.role,
          status = 'active',
          company_id = ${sqlLiteral(companyId)}::uuid,
          updated_at = now()
      from (values ${roleRowsSql}) as role_data(user_id, role)
      where profile.id = role_data.user_id;

      insert into public.user_farm_access (user_id, farm_id, access_role, modules)
      select role_data.user_id, ${sqlLiteral(farmA)}::uuid, role_data.role, '{}'::jsonb
      from (values ${roleRowsSql}) as role_data(user_id, role)
      on conflict (user_id, farm_id) do update
      set access_role = excluded.access_role, updated_at = now();
    `);

    const adminId = users.find((user) => user.role === 'admin_support').id;
    const funder = users.find((user) => user.role === 'financeur_externe');
    await runSql(`
      insert into public.smartfarm_events (id, farm_id, event_type, message, payload, is_deleted)
      values
        (${sqlLiteral(`${marker}-event-a`)}, ${sqlLiteral(farmA)}::uuid, 'rls_check', 'Ferme A', '{"test_rls":true}'::jsonb, false),
        (${sqlLiteral(`${marker}-event-b`)}, ${sqlLiteral(farmB)}::uuid, 'rls_check', 'Ferme B', '{"test_rls":true}'::jsonb, false),
        (${sqlLiteral(`${marker}-event-deleted`)}, ${sqlLiteral(farmA)}::uuid, 'rls_check', 'Supprime', '{"test_rls":true}'::jsonb, true);

      insert into public.funder_accounts (
        owner_user_id, user_id, email, organization, display_name, status, farm_id
      ) values (
        ${sqlLiteral(adminId)}::uuid, ${sqlLiteral(funder.id)}::uuid, ${sqlLiteral(funder.email)},
        'Controle RLS', 'Financeur temporaire', 'active', ${sqlLiteral(farmA)}::uuid
      );

      insert into public.funding_reports (
        owner_user_id, title, status, visibility, immutable, source_snapshot_hash,
        public_summary, published_at, farm_id
      ) values
        (${sqlLiteral(adminId)}::uuid, ${sqlLiteral(`${marker}-rapport-publie`)}, 'published', 'shared', true, ${sqlLiteral(`${marker}-hash-published`)}, 'Rapport partage', now(), ${sqlLiteral(farmA)}::uuid),
        (${sqlLiteral(adminId)}::uuid, ${sqlLiteral(`${marker}-rapport-brouillon`)}, 'draft', 'shared', true, ${sqlLiteral(`${marker}-hash-draft`)}, 'Rapport prive', null, ${sqlLiteral(farmA)}::uuid);
    `);

    for (const user of users) user.token = await signInIsolationUser(user, keys.anonKey);

    const expectations = SMARTFARM_EXPECTATIONS;

    for (const user of users) {
      const expected = expectations[user.role];
      const smartReadA = await rpcBoolean('can_read_farm_table', {
        target_farm_id: farmA,
        target_table: 'smartfarm_events',
      }, user.token, keys.anonKey);
      const smartWriteA = await rpcBoolean('can_insert_farm_table', {
        target_farm_id: farmA,
        target_table: 'smartfarm_events',
      }, user.token, keys.anonKey);
      const smartReadB = await rpcBoolean('can_read_farm_table', {
        target_farm_id: farmB,
        target_table: 'smartfarm_events',
      }, user.token, keys.anonKey);
      const smartWriteB = await rpcBoolean('can_insert_farm_table', {
        target_farm_id: farmB,
        target_table: 'smartfarm_events',
      }, user.token, keys.anonKey);
      check(smartReadA === expected.smartRead, `${user.role} lecture Smart Farm A`);
      check(smartWriteA === expected.smartWrite, `${user.role} ecriture Smart Farm A`);
      check(smartReadB === (expected.farmB && expected.smartRead), `${user.role} lecture ferme B`);
      check(smartWriteB === (expected.farmB && expected.smartWrite), `${user.role} ecriture ferme B`);

      const rowsResponse = await restAsUser(
        `/smartfarm_events?select=id,farm_id,is_deleted&id=like.${marker}*`,
        user.token,
        keys.anonKey,
      );
      const visibleRows = requireProjectOk(rowsResponse, `Lecture Smart Farm ${user.role}`);
      const expectedRows = expected.smartRead ? (expected.farmB ? 2 : 1) : 0;
      check(Array.isArray(visibleRows) && visibleRows.length === expectedRows, `${user.role} lignes visibles par ferme`);
      check(!visibleRows.some((row) => row.id === `${marker}-event-deleted`), `${user.role} suppression logique masquee`);

      const writeResponse = await restAsUser('/smartfarm_events', user.token, keys.anonKey, {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          id: `rls-write-${randomUUID()}`,
          farm_id: farmA,
          event_type: 'rls_write_check',
          message: user.role,
          payload: { test_rls: true },
        }),
      });
      const writeAccepted = writeResponse.status >= 200 && writeResponse.status < 300;
      check(writeAccepted === expected.smartWrite, `${user.role} ecriture REST reelle`);
    }

    const domainChecks = DOMAIN_CHECKS;
    for (const user of users) {
      for (const [table, expectedRead, expectedWrite] of domainChecks[user.role]) {
        const canRead = await rpcBoolean('can_read_farm_table', {
          target_farm_id: farmA,
          target_table: table,
        }, user.token, keys.anonKey);
        const canWrite = await rpcBoolean('can_insert_farm_table', {
          target_farm_id: farmA,
          target_table: table,
        }, user.token, keys.anonKey);
        check(canRead === expectedRead, `${user.role} lecture ${table}`);
        check(canWrite === expectedWrite, `${user.role} ecriture ${table}`);
      }
    }

    const funderReportsResponse = await restAsUser(
      `/funding_reports?select=title,status,visibility,immutable&title=like.${marker}*`,
      funder.token,
      keys.anonKey,
    );
    const funderReports = requireProjectOk(funderReportsResponse, 'Lecture du reporting financeur');
    check(Array.isArray(funderReports) && funderReports.length === 1, 'financeur voit un seul rapport');
    check(funderReports[0]?.status === 'published' && funderReports[0]?.immutable === true, 'financeur voit uniquement le rapport publie immuable');

    console.log(`Isolation comportementale: ${assertions} assertions, 8 roles, 2 fermes, 0 fuite.`);
  } catch (error) {
    primaryError = error;
  } finally {
    const cleanupErrors = [];
    if (farms.length) {
      const farmIds = farms.map((farmId) => `${sqlLiteral(farmId)}::uuid`).join(', ');
      try {
        await runSql(`
          delete from public.funder_access_logs where farm_id in (${farmIds});
          delete from public.funding_reports where farm_id in (${farmIds});
          delete from public.funder_accounts where farm_id in (${farmIds});
          delete from public.smartfarm_events where farm_id in (${farmIds});
          delete from public.user_farm_access where farm_id in (${farmIds});
          delete from public.farms where id in (${farmIds});
        `);
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (keys?.serviceKey) {
      for (const user of [...users].reverse()) {
        try { await deleteIsolationUser(user.id, keys.serviceKey); } catch (error) { cleanupErrors.push(error); }
      }
    }
    if (primaryError) throw primaryError;
    if (cleanupErrors.length) throw new Error(`Nettoyage du controle RLS incomplet: ${cleanupErrors[0].message}`);
    console.log('Nettoyage du controle RLS: complet.');
  }
}

async function main() {
  await assertProjectIdentity();

  if (action === 'status') {
    const rows = await runSql(statusSql);
    console.table(rows);
    const authRoles = await runSql(`
      select
        coalesce(nullif(raw_user_meta_data->>'role', ''), 'missing') as metadata_role,
        coalesce(nullif(raw_user_meta_data->>'status', ''), 'missing') as metadata_status,
        count(*)::integer as users
      from auth.users
      group by 1, 2
      order by 1, 2;
    `);
    console.log('Comptes Auth par role et statut declares:');
    console.table(authRoles);
    const functions = await runSql(`
      select required.name, to_regprocedure('public.' || required.name || '(uuid)') is not null as exists
      from (values ('can_access_farm'), ('can_read_farm'), ('can_write_farm')) as required(name)
      order by required.name;
    `);
    console.log('Fonctions RLS multi-fermes:');
    console.table(functions);
    if (rows.find((row) => row.name === 'profiles')?.exists) {
      const profileRoles = await runSql(`
        select role, status, count(*)::integer as profiles
        from public.profiles
        group by role, status
        order by role, status;
      `);
      console.log('Profils metier:');
      console.table(profileRoles);
    }
    if (rows.find((row) => row.name === 'farms')?.exists) {
      const farmStats = await runSql(`
        select
          (select count(*)::integer from public.farms) as farms,
          (select count(*)::integer from public.farms where is_default) as default_farms,
          (select count(*)::integer from public.user_farm_access) as farm_accesses;
      `);
      console.log('Perimetre multi-fermes:');
      console.table(farmStats);
    }
    const appliedVersions = await getAppliedVersions();
    console.log(`Historique migrations: ${appliedVersions.size} version(s).`);
    if (appliedVersions.size) console.log([...appliedVersions].sort().join(', '));
    const modulesSource = readFileSync(join(root, 'src/config/modules.config.js'), 'utf8');
    const constantsSource = readFileSync(join(root, 'src/utils/constants.js'), 'utf8');
    const crudBlock = modulesSource.match(/export const CRUD_KEYS = \[([\s\S]*?)\];/)?.[1] || '';
    const crudKeys = [...crudBlock.matchAll(/'([^']+)'/g)].map((match) => match[1]);
    const tableByModule = new Map(
      [...constantsSource.matchAll(/^\s*(\w+):\s*\{[^\n}]*table:\s*'([^']+)'/gm)]
        .map((match) => [match[1], match[2]]),
    );
    const expectedPhysicalTables = [...new Set(crudKeys.map((key) => tableByModule.get(key) || key))];
    const publicTables = await runSql("select tablename from pg_tables where schemaname = 'public' order by tablename");
    const remoteTables = new Set((publicTables || []).map((row) => row.tablename));
    const missingCrudTables = expectedPhysicalTables.filter((table) => !remoteTables.has(table));
    console.log(`Tables physiques CRUD attendues: ${expectedPhysicalTables.length}; manquantes: ${missingCrudTables.length}.`);
    if (missingCrudTables.length) console.log(missingCrudTables.join(', '));
    const sourceReferencedTables = new Set();
    listSourceFiles(join(root, 'src')).forEach((file) => {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/(?:createSupabaseCrudService|supabase\.from)\(\s*['"]([a-z][a-z0-9_]*)['"]/g)) {
        sourceReferencedTables.add(match[1]);
      }
    });
    const missingSourceTables = [...sourceReferencedTables].sort().filter((table) => !remoteTables.has(table));
    console.log(`Tables referencees directement par les sources: ${sourceReferencedTables.size}; manquantes: ${missingSourceTables.length}.`);
    if (missingSourceTables.length) console.log(missingSourceTables.join(', '));
    return;
  }

  if (action === 'matrix') {
    const rows = await runSql(farmRlsMatrixSql());
    if (requestedFiles.includes('--json')) console.log(JSON.stringify(rows, null, 2));
    else console.table(rows);
    const anomalies = rows.filter((row) => row.existe && !(
      row.farm_id_uuid
      && row.farm_id_obligatoire
      && row.index_farm_id
      && row.fk_ferme
      && row.rls_active
      && row.rls_forcee
      && row.droits_authenticated
      && row.politique_lecture
      && row.politique_insertion
      && row.politique_modification
      && row.politique_suppression
      && row.suppression_logique_locale
    ));
    const existing = rows.filter((row) => row.existe).length;
    console.log(`Matrice farm_id/RLS: ${existing} table(s) existante(s), ${rows.length - existing} absente(s), ${anomalies.length} anomalie(s).`);
    if (anomalies.length) process.exitCode = 1;
    return;
  }

  if (action === 'isolation') {
    await verifyRoleIsolation();
    return;
  }

  if (action === 'apply') {
    if (!requestedFiles.length) throw new Error('Indiquez au moins une migration SQL a appliquer.');
    const files = requestedFiles.map((file) => resolveSqlFile(file, { migrationOnly: true }));
    const applied = await getAppliedVersions();
    for (const file of files) {
      const filename = basename(file);
      const version = filename.split('_')[0];
      const repeatable = filename === FARM_RLS_MIGRATION;
      if (applied.has(version) && !repeatable) {
        console.log(`Deja appliquee: ${basename(file)}`);
        continue;
      }
      if (filename === MULTI_FARM_MIGRATION) await assertMultiFarmPrerequisites();
      if (filename === FARM_RLS_MIGRATION) await assertFarmRlsPrerequisites();
      process.stdout.write(`Application: ${basename(file)} ... `);
      await runSql(readFileSync(file, 'utf8'));
      await recordMigration(file);
      console.log('OK');
      if (filename === FARM_RLS_MIGRATION) await verifyFarmRls();
    }
    return;
  }

  if (action === 'verify') {
    if (requestedFiles.length !== 1) throw new Error('Indiquez un unique fichier SQL de verification.');
    const file = resolveSqlFile(requestedFiles[0]);
    const rows = await runSql(readFileSync(file, 'utf8'));
    if (Array.isArray(rows) && rows.length === 0) {
      console.log(`Verification valide: ${basename(file)} retourne zero anomalie.`);
      return;
    }
    console.table(rows);
    process.exitCode = 1;
    return;
  }

  throw new Error(`Action inconnue: ${action}. Utilisez status, matrix, isolation, apply ou verify.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
