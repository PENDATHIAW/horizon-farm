/**
 * Extraction de texte depuis photo / PDF / fichier — sans écriture base.
 */

const clean = (value) => String(value || '').trim();

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Lecture fichier impossible'));
    reader.readAsText(file);
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error || new Error('Encodage fichier impossible'));
    reader.readAsDataURL(file);
  });
}

/**
 * Appel OCR serveur (vision LLM si configuré).
 */
export async function fetchDocumentOcr({ file, fileName = '' } = {}) {
  if (!file) return { ok: false, text: '', source: 'none' };
  try {
    const base64 = await fileToBase64(file);
    const mime = file.type || 'image/jpeg';
    const res = await fetch('/api/assistant/document-ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64, mime, fileName: fileName || file.name }),
    });
    if (!res.ok) return { ok: false, text: '', source: 'api_error', status: res.status };
    const data = await res.json();
    return {
      ok: Boolean(data.ok && data.text),
      text: clean(data.text),
      source: data.source || 'ocr_api',
      confidence: data.confidence ?? 0.7,
    };
  } catch {
    return { ok: false, text: '', source: 'network_error' };
  }
}

/**
 * Extrait le texte d'un document importé.
 * Priorité : texte collé > fichier texte > OCR API > indice nom de fichier.
 */
export async function extractTextFromDocument(file = null, options = {}) {
  const pastedText = clean(options.pastedText);
  if (pastedText) {
    return { text: pastedText, source: 'pasted', confidence: 0.95 };
  }

  if (!file) {
    return { text: '', source: 'empty', confidence: 0, hint: 'Importez une photo ou collez le texte extrait.' };
  }

  const fileName = file.name || '';
  const mime = (file.type || '').toLowerCase();

  if (mime.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.csv')) {
    const text = await readFileAsText(file);
    return { text: clean(text), source: 'text_file', confidence: 0.9, fileName };
  }

  if (mime.startsWith('image/') || mime === 'application/pdf') {
    const ocr = await fetchDocumentOcr({ file, fileName });
    if (ocr.ok && ocr.text) {
      return { text: ocr.text, source: ocr.source, confidence: ocr.confidence ?? 0.75, fileName };
    }
    return {
      text: '',
      source: 'ocr_fallback',
      confidence: 0.35,
      fileName,
      hint: 'OCR indisponible ou non configuré. Collez le texte de la facture ci-dessous.',
      needsManualText: true,
    };
  }

  return {
    text: clean(fileName.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]/g, ' ')),
    source: 'filename_hint',
    confidence: 0.25,
    fileName,
    hint: 'Type de fichier non reconnu — précisez le type et collez le texte.',
    needsManualText: true,
  };
}

export function createPreviewUrl(file) {
  if (!file || typeof URL === 'undefined' || !URL.createObjectURL) return '';
  return URL.createObjectURL(file);
}

export function revokePreviewUrl(url) {
  if (url && typeof URL !== 'undefined' && URL.revokeObjectURL) {
    try { URL.revokeObjectURL(url); } catch { /* ignore */ }
  }
}
