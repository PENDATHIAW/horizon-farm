/**
 * OCR Intelligent Horizon - extraction facture fournisseur (simulation texte ou scanner existant).
 */

import {
  classifyScannerDocumentType,
  parsePurchaseInvoice,
  listMissingScannerFields,
} from '../aiGateway/documentScannerParser.js';
import { SCANNER_DOC_TYPES } from '../aiGateway/documentScannerTypes.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const PRODUCT_CATEGORIES = {
  aliment: ['aliment', 'feed', 'provende', 'mais', 'maïs', 'son', 'farine', 'concentre', 'concentré'],
  poussins: ['poussin', 'poussins', 'one day', 'jourd', 'chair', 'pondeuse'],
  medicaments: ['vaccin', 'medicament', 'médicament', 'antibio', 'ivermectin', 'vermifuge', 'vitamine'],
  materiel: ['materiel', 'matériel', 'equipement', 'équipement', 'couveuse', 'abreuvoir', 'mangeoire', 'pompe'],
  transport: ['transport', 'livraison', 'carburant', 'fret', 'camion', 'logistique'],
};

const STOCKABLE_CATEGORIES = new Set(['aliment', 'poussins', 'medicaments', 'materiel']);

function categorizeProduct(name = '') {
  const text = lower(name);
  for (const [category, keywords] of Object.entries(PRODUCT_CATEGORIES)) {
    if (keywords.some((kw) => text.includes(kw))) return category;
  }
  return 'intrant';
}

function isStockableProduct(name = '', category = '') {
  const cat = category || categorizeProduct(name);
  if (cat === 'transport') return false;
  if (STOCKABLE_CATEGORIES.has(cat)) return true;
  return /stock|intrant|sac|kg|aliment|vaccin|materiel|equipement/i.test(name);
}

function parseAmountToken(raw = '') {
  const match = String(raw).match(/(\d+(?:[\s.,]\d+)*)/);
  if (!match) return null;
  return n(match[1].replace(/\s/g, '').replace(',', '.'));
}

const n = (value) => {
  const num = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(num) ? num : null;
};

function enrichLine(line = {}) {
  const produit = clean(line.produit || line.product_name || line.libelle);
  const category = line.category || categorizeProduct(produit);
  return {
    ...line,
    produit,
    category,
    stockable: line.stockable ?? isStockableProduct(produit, category),
    prix_unitaire: line.prix_unitaire ?? line.unit_price ?? null,
    quantite: line.quantite ?? line.quantity ?? null,
    unite: line.unite || line.unit || 'u',
    montant_ligne: line.montant_ligne
      ?? (line.prix_unitaire && line.quantite ? Math.round(line.prix_unitaire * line.quantite) : null),
  };
}

function refineInvoiceFromText(raw = '', fields = {}) {
  const text = lower(raw);
  const amounts = [...raw.matchAll(/(\d+(?:[\s.,]\d+)*)\s*(?:fcfa|f\s*cfa|xof|francs?)/gi)]
    .map((m) => parseAmountToken(m[1]))
    .filter((v) => v != null && v > 0);
  const montantTotal = amounts.length ? Math.max(...amounts) : fields.montant_total;

  const sacLine = raw.match(/(\d+(?:[.,]\d+)?)\s*sacs?\s*(?:d['’]?)?\s*[^x\n]*x\s*(\d[\d\s.,]*)\s*(?:fcfa|f\s*cfa|xof)/i);
  const alimentLine = raw.match(/(aliment[^,\n-]*(?:chair|pondeuse|volaille)?)/i);
  const poussinLine = raw.match(/(poussins?[^,\n]*)/i);
  const medicLine = raw.match(/(vaccin[^,\n]*|antibio[^,\n]*|medicament[^,\n]*)/i);
  const transportLine = /(transport|livraison|logistique|fret)/i.test(text);

  const transportPrimary = /(forfait\s+livraison|trans\s+logistique|fret\b)/i.test(text);

  let produit = fields.produit || '';
  let quantite = fields.quantite;
  let prixUnitaire = fields.prix_unitaire;
  let unite = fields.unite || 'u';

  if (transportPrimary || (transportLine && !poussinLine && !medicLine && !sacLine)) {
    produit = produit || 'Transport / livraison';
    quantite = quantite || 1;
    prixUnitaire = prixUnitaire || montantTotal;
    unite = 'forfait';
    return {
      produit,
      quantite,
      prix_unitaire: prixUnitaire,
      unite,
      montant_total: montantTotal,
      lignes: [{
        produit,
        quantite,
        prix_unitaire: prixUnitaire,
        unite,
        category: 'transport',
        stockable: false,
        montant_ligne: montantTotal,
      }],
      stockable: false,
      categories: ['transport'],
    };
  }

  if (sacLine) {
    quantite = n(sacLine[1]);
    prixUnitaire = parseAmountToken(sacLine[2]);
    produit = alimentLine?.[1]?.trim() || 'Aliment';
    unite = 'sac';
  } else if (poussinLine) {
    const qtyMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*(?:tetes?|têtes?|poussins?)/i);
    const priceMatch = raw.match(/(?:x|à|@)\s*(\d[\d\s.,]*)\s*(?:fcfa|f\s*cfa|xof)/i);
    produit = clean(poussinLine[1]);
    quantite = qtyMatch ? n(qtyMatch[1]) : quantite;
    prixUnitaire = priceMatch ? parseAmountToken(priceMatch[1]) : prixUnitaire;
    unite = 'tête';
  } else if (medicLine) {
    produit = clean(medicLine[1]);
  } else if (alimentLine) {
    produit = clean(alimentLine[1]);
  }

  if (!prixUnitaire && montantTotal && quantite) {
    prixUnitaire = Math.round(montantTotal / quantite);
  }

  const lignes = arr(fields.lignes)
    .filter((line) => !/^(date|total|paiement)/i.test(clean(line.produit)))
    .map(enrichLine);

  const primaryLine = enrichLine({
    produit,
    quantite,
    prix_unitaire: prixUnitaire,
    unite,
    montant_ligne: montantTotal,
  });

  const mergedLines = lignes.length ? lignes : [primaryLine];
  const bestLine = mergedLines.find((l) => l.category === 'aliment')
    || mergedLines.find((l) => l.category === 'poussins')
    || mergedLines.find((l) => l.category === 'medicaments')
    || mergedLines.find((l) => l.category === 'transport')
    || primaryLine;

  return {
    produit: bestLine.produit || produit,
    quantite: bestLine.quantite ?? quantite,
    prix_unitaire: bestLine.prix_unitaire ?? prixUnitaire,
    unite: bestLine.unite || unite,
    montant_total: montantTotal,
    lignes: mergedLines.length ? mergedLines : [bestLine],
    stockable: mergedLines.some((l) => l.stockable) && bestLine.category !== 'transport',
    categories: [...new Set(mergedLines.map((l) => l.category))],
  };
}

/**
 * Parse une facture fournisseur (texte OCR simulé ou extrait scanner).
 */
export function parseInvoiceOcrText(text = '', context = {}) {
  const raw = clean(text);
  const docType = classifyScannerDocumentType(raw, '', SCANNER_DOC_TYPES.PURCHASE_INVOICE);
  const fields = parsePurchaseInvoice(raw, context);
  const refined = refineInvoiceFromText(raw, fields);
  const lignes = arr(refined.lignes).map(enrichLine);
  const stockableLines = lignes.filter((l) => l.stockable);
  const expenseLines = lignes.filter((l) => !l.stockable);

  return {
    doc_type: docType,
    fournisseur: fields.fournisseur,
    fournisseur_id: fields.fournisseur_id || '',
    date: fields.date,
    lignes,
    produit: refined.produit || lignes[0]?.produit || fields.produit || '',
    quantite: refined.quantite ?? lignes[0]?.quantite ?? fields.quantite,
    prix_unitaire: refined.prix_unitaire ?? lignes[0]?.prix_unitaire ?? fields.prix_unitaire,
    unite: refined.unite || lignes[0]?.unite || fields.unite || 'kg',
    montant_total: refined.montant_total ?? fields.montant_total,
    statut_paiement: fields.statut_paiement,
    payment_status: fields.payment_status,
    stockable: refined.stockable ?? (stockableLines.length > 0 || isStockableProduct(fields.produit)),
    stockable_count: stockableLines.length,
    expense_count: expenseLines.length,
    categories: refined.categories?.length ? refined.categories : [...new Set(lignes.map((l) => l.category))],
    preuve_texte: raw.slice(0, 4000),
    missing_fields: listMissingScannerFields(SCANNER_DOC_TYPES.PURCHASE_INVOICE, {
      ...fields,
      produit: refined.produit,
      quantite: refined.quantite,
      prix_unitaire: refined.prix_unitaire,
      montant_total: refined.montant_total,
    }),
  };
}

/** Exemples de factures simulées pour démo interne. */
export const INVOICE_OCR_DEMO_SAMPLES = [
  {
    id: 'demo-aliment',
    label: 'Facture aliment (+14 %)',
    category: 'aliment',
    text: `FACTURE FOURNISSEUR
SEN AGRO DISTRIBUTION
Date: 15/03/2026
Aliment chair 50 kg - 10 sacs x 14 250 FCFA
Total TTC: 142 500 FCFA
Paiement: à crédit 30 jours`,
  },
  {
    id: 'demo-poussins',
    label: 'Facture poussins',
    category: 'poussins',
    text: `Facture AVICOL PLUS
Date 02/03/2026
Poussins chair one-day - 500 têtes x 350 FCFA
Total 175 000 FCFA - payé espèces`,
  },
  {
    id: 'demo-medicament',
    label: 'Facture médicaments',
    category: 'medicaments',
    text: `Facture VET SANTE
Vaccin Newcastle - 20 flacons x 4 500 FCFA
Antibiotique 5 L x 12 000 FCFA
Total 210 000 FCFA payé`,
  },
  {
    id: 'demo-transport',
    label: 'Facture transport',
    category: 'transport',
    text: `Facture TRANS LOGISTIQUE
Transport aliment Dakar-Thiès
Forfait livraison 45 000 FCFA
Date 10/03/2026 - payé`,
  },
];

export default parseInvoiceOcrText;
