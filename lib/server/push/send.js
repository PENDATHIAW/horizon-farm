export default async function handler(req, res) {
  // Compatibilité : route /api/push/send
  const mod = await import('./sendToSubscriptions.js');
  return mod.sendPayloadHandler(req, res);
}
