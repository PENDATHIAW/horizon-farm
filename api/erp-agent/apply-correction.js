const json = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
};

const readBody = async (req) => new Promise((resolve, reject) => {
  let body = '';
  req.on('data', (chunk) => { body += chunk; if (body.length > 1_000_000) reject(new Error('Payload trop volumineux')); });
  req.on('end', () => {
    try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('JSON invalide')); }
  });
  req.on('error', reject);
});

const env = (key) => process.env[key] || '';
const safePath = (path = '') => {
  if (!path || path.includes('..') || path.startsWith('/') || path.includes('node_modules')) return false;
  if (path.startsWith('.github/')) return false;
  if (/\.env/i.test(path)) return false;
  return ['src/', 'api/', 'docs/'].some((prefix) => path.startsWith(prefix));
};

const gh = async (url, options = {}) => {
  const token = env('GITHUB_TOKEN');
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!response.ok) {
    const error = new Error(data?.message || `GitHub API ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
};

const getFileSha = async ({ owner, repo, path, branch }) => {
  try {
    const data = await gh(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(branch)}`);
    return data?.sha || null;
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
};

const upsertFile = async ({ owner, repo, branch, path, content, message }) => {
  const sha = await getFileSha({ owner, repo, path, branch });
  const payload = {
    message,
    content: Buffer.from(content, 'utf8').toString('base64'),
    branch,
    ...(sha ? { sha } : {}),
  };
  const data = await gh(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return { path, sha: data?.content?.sha, commit: data?.commit?.sha };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Méthode non autorisée' });

  const owner = env('GITHUB_OWNER') || 'PENDATHIAW';
  const repo = env('GITHUB_REPO') || 'horizon-farm';
  const branch = env('GITHUB_BRANCH') || 'feature/objectifs-croissance-centre-decisionnel';
  const token = env('GITHUB_TOKEN');
  const approvalSecret = env('ERP_AGENT_APPROVAL_SECRET');
  const deployHookUrl = env('VERCEL_DEPLOY_HOOK_URL');

  if (!token || !approvalSecret) {
    return json(res, 503, { ok: false, status: 'not_configured', error: 'Agent non configuré : GITHUB_TOKEN et ERP_AGENT_APPROVAL_SECRET sont obligatoires.' });
  }

  try {
    const body = await readBody(req);
    const { approvalCode, lot, files = [], message, dryRun = false } = body;

    if (!approvalCode || approvalCode !== approvalSecret) return json(res, 401, { ok: false, error: 'Code approbation invalide' });
    if (!Array.isArray(files) || files.length === 0) return json(res, 400, { ok: false, error: 'Aucun fichier à corriger fourni par l’agent.' });
    if (files.length > 12) return json(res, 400, { ok: false, error: 'Trop de fichiers dans un seul lot. Corriger en plus petits lots.' });

    for (const file of files) {
      if (!safePath(file.path)) return json(res, 400, { ok: false, error: `Chemin interdit : ${file.path}` });
      if (typeof file.content !== 'string') return json(res, 400, { ok: false, error: `Contenu invalide : ${file.path}` });
    }

    const commitMessage = message || `ERP agent correction - ${lot || 'lot contrôlé'}`;
    if (dryRun) return json(res, 200, { ok: true, dryRun: true, owner, repo, branch, files: files.map((f) => f.path), message: commitMessage });

    const results = [];
    for (const file of files) {
      // GitHub Contents API updates must be serialized to avoid conflicts.
      // eslint-disable-next-line no-await-in-loop
      results.push(await upsertFile({ owner, repo, branch, path: file.path, content: file.content, message: commitMessage }));
    }

    let deploy = null;
    if (deployHookUrl) {
      const deployResponse = await fetch(deployHookUrl, { method: 'POST' });
      deploy = { triggered: deployResponse.ok, status: deployResponse.status };
    }

    return json(res, 200, { ok: true, status: 'committed', owner, repo, branch, lot, files: results, deploy });
  } catch (error) {
    return json(res, error.status || 500, { ok: false, error: error.message || 'Erreur agent', details: error.data || null });
  }
}
