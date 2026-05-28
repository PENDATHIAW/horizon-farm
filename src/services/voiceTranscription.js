export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const getApiLanguage = (language) => ({ wo: 'wo', fr: 'fr', en: 'en' }[language] || 'auto');

export async function transcribeVoiceNote(blob, language = 'wo') {
  const audioData = await blobToDataUrl(blob);
  const response = await fetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioData,
      mimeType: blob.type || 'audio/webm',
      language: getApiLanguage(language),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Transcription serveur indisponible.');
  return String(data?.text || '').trim();
}
