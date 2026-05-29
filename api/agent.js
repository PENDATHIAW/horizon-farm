export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  return res.status(200).json({
    side: 'assistant',
    text: `Agent serveur Horizon prêt. Message reçu : ${body.text || ''}`,
    language: body.language || 'fr',
    erp: { module: 'agent', intent: 'ready' }
  });
}
