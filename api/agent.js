export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({
    side: 'assistant',
    text: 'Horizon Agent route ready.',
    language: 'fr',
    erp: { module: 'agent', intent: 'ready' }
  });
}
