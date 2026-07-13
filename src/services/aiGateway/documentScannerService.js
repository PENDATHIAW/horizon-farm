/**
 * Orchestrateur scanner document IA - extraction → compréhension → brouillon.
 */

import { extractTextFromDocument } from './documentTextExtraction.js';
import { buildScannerDraft } from './documentScannerDrafts.js';
import { SCANNER_DOC_TYPES } from './documentScannerTypes.js';

/**
 * Pipeline complet : fichier + contexte ERP → brouillon structuré.
 */
export async function scanDocumentToDraft({
  file = null,
  pastedText = '',
  docType = '',
  context = {},
  proofMeta = {},
} = {}) {
  const extraction = await extractTextFromDocument(file, { pastedText });
  const text = extraction.text || pastedText || '';
  const draft = buildScannerDraft({
    text,
    fileName: file?.name || proofMeta.fileName || '',
    docType,
    extraction,
    context,
    proofMeta: {
      ...proofMeta,
      file_url: proofMeta.file_url || proofMeta.proof_url,
      fileName: file?.name,
    },
  });

  return {
    draft,
    extraction,
    empty: !text && extraction.needsManualText,
  };
}

export { SCANNER_DOC_TYPES };
