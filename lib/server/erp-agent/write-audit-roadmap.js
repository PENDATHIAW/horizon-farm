const json = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
};

const readBody = async (req) => new Promise((resolve, reject) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 2_000_000) reject(new Error('Payload trop volumineux'));
  });
  req.on('end', () => {
    try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('JSON invalide')); }
  });
  req.on('error', reject);
});

const env = (key) => process.env[key] || '';

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
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!response.ok) {
    const error = new Error(data?.message || `GitHub API ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
};

const safeAuditPath = (path = '') => /^docs\/audit-results\/current\/audit-roadmap\.(json|md)$/.test(path);

const contentUrl = ({ owner, repo, path, branch }) =>
  `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(branch)}`;

const getFileSha = async ({ owner, repo, path, branch }) => {
  try {
    const data = await gh(contentUrl({ owner, repo, path, branch }));
    return data?.sha || null;
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
};

const upsertFile = async ({ owner, repo, branch, path, content, message }) => {
  if (!safeAuditPath(path)) throw new Error(`Chemin audit interdit : ${path}`);
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

  if (!token) return json(res, 503, { ok: false, error: 'GITHUB_TOKEN manquant : impossible d’écrire la feuille de route audit dans GitHub.' });

  try {
    const body = await readBody(req);
    const { roadmap, markdown, modulesAudited = 0, findingsCount = 0 } = body;

    if (!roadmap || typeof roadmap !== 'object') return json(res, 400, { ok: false, error: 'roadmap JSON manquant ou invalide.' });
    if (!markdown || typeof markdown !== 'string') return json(res, 400, { ok: false, error: 'markdown manquant ou invalide.' });

    const generatedAt = new Date().toISOString();
    const normalizedRoadmap = {
      ...roadmap,
      generated_at: roadmap.generated_at || generatedAt,
      modules_audited: modulesAudited || roadmap.modules_audited || 0,
      findings_count: findingsCount || roadmap.findings_count || 0,
      source: 'Assistant ERP · audit roadmap GitHub',
    };

    const message = `ERP audit roadmap - ${normalizedRoadmap.modules_audited} modules - ${normalizedRoadmap.findings_count} findings`;
    const jsonContent = `${JSON.stringify(normalizedRoadmap, null, 2)}\n`;
    const mdContent = markdown.endsWith('\n') ? markdown : `${markdown}\n`;

    const jsonResult = await upsertFile({ owner, repo, branch, path: 'docs/audit-results/current/audit-roadmap.json', content: jsonContent, message });
    const mdResult = await upsertFile({ owner, repo, branch, path: 'docs/audit-results/current/audit-roadmap.md', content: mdContent, message });

    return json(res, 200, {
      ok: true,
      status: 'generated',
      owner,
      repo,
      branch,
      modulesAudited: normalizedRoadmap.modules_audited,
      findingsCount: normalizedRoadmap.findings_count,
      files: [jsonResult, mdResult],
      message: `Feuille de route GitHub générée pour ${normalizedRoadmap.modules_audited} module(s).`,
    });
  } catch (error) {
    return json(res, error.status || 500, { ok: false, error: error.message || 'Erreur génération feuille de route audit', details: error.data || null });
  }
}
