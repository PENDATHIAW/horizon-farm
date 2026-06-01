function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export default function handler(_req, res) {
  return json(res, 200, {
    ok: true,
    sha: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'local',
    ref: process.env.VERCEL_GIT_COMMIT_REF || 'main',
    builtAt: process.env.VERCEL_DEPLOYMENT_CREATED_AT || new Date().toISOString(),
  });
}
