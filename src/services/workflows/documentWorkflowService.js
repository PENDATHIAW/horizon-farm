/** Document/preuve lié à source_module + source_record_id. */
export function buildDocumentLinkPayload({ document = {}, sourceModule = '', sourceRecordId = '', documentType = 'preuve' } = {}) {
  return {
    ...document,
    source_module: sourceModule || document.source_module,
    source_record_id: sourceRecordId || document.source_record_id,
    document_type: documentType || document.document_type || 'preuve',
    origin_type: document.origin_type || 'workflow',
  };
}

export function isOrphanDocument(document = {}) {
  return !document.source_module && !document.source_record_id && !document.related_id && !document.invoice_id;
}
