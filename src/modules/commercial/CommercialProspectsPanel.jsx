import { UserPlus, ArrowRightCircle, FileText } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { fmtCurrency } from '../../utils/format';
import {
  buildProspectCreatePayload,
  buildProspectConversionPatch,
  buildProspectPipeline,
  PROSPECT_STATUSES,
} from '../../utils/commercialProspects.js';
import { prepareCommercialQuoteCommit } from '../../utils/commercialQuoteWorkflow.js';

const PROSPECT_INTERESTS = [
  'Œufs / tablettes',
  'Poulets de chair',
  'Bovins / viande',
  'Ovins / caprins',
  'Cultures maraîchères',
  'Fumier / engrais organique',
  'Abonnement livraison',
  'Produits fermiers',
  'Autre',
];

function ProspectBlock({ title, rows, tone = 'neutral', onConvertQuote, onConvertClient }) {
  if (!rows.length) return null;
  return (
    <section className={`rounded-card border p-4 ${tone === 'hot' ? 'border-urgent bg-urgent-bg' : 'border-line bg-white'}`}>
      <p className="mb-2 text-sm font-semibold text-earth">{title} ({rows.length})</p>
      <div className="space-y-2">
        {rows.slice(0, 6).map((row) => (
          <div key={row.id} className="flex flex-col justify-between gap-2 rounded-card border border-line bg-card p-3 md:flex-row md:items-center">
            <div>
              <p className="font-semibold text-earth">{row.name}</p>
              <p className="text-xs text-slate">{row.source || 'Source ?'} · {row.interest || '-'} · prob. {row.probability || 0}% · {fmtCurrency(row.estimatedNeed)}</p>
              <p className="text-meta text-horizon-dark">{row.nextAction || 'Prochaine action à définir'}</p>
            </div>
            <div className="flex flex-wrap gap-1">
              <button type="button" onClick={() => onConvertQuote(row)} className="rounded-control border border-line bg-neutral-bg px-2 py-1 text-meta font-semibold text-neutral"><FileText size={12} className="inline" /> Devis</button>
              <button type="button" onClick={() => onConvertClient(row)} className="rounded-control border border-positive bg-positive-bg px-2 py-1 text-meta font-semibold text-positive"><ArrowRightCircle size={12} className="inline" /> Client</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function CommercialProspectsPanel({
  clients = [],
  onCreateClient,
  onUpdateClient,
  onCreateOrder,
  onCreateItem,
  onRefreshWorkflow,
  farmScope,
  accessibleFarms,
  activeFarm,
  onNewQuote,
}) {
  const pipeline = buildProspectPipeline(clients);
  const [prospectOpen, setProspectOpen] = useState(false);
  const [prospectForm, setProspectForm] = useState({
    name: '',
    phone: '',
    interest: 'Produits fermiers',
    estimatedNeed: '50000',
  });

  const createProspect = async () => {
    if (!prospectForm.name.trim()) {
      toast.error('Indiquez le nom du prospect');
      return;
    }
    const payload = buildProspectCreatePayload({
      name: prospectForm.name.trim(),
      phone: prospectForm.phone.trim(),
      source: 'terrain',
      interest: prospectForm.interest.trim() || 'Produits fermiers',
      estimatedNeed: Number(prospectForm.estimatedNeed) || 50000,
      probability: 60,
      nextAction: 'Premier contact',
      status: PROSPECT_STATUSES.HOT,
    });
    await onCreateClient?.(payload);
    setProspectForm({ name: '', phone: '', interest: 'Produits fermiers', estimatedNeed: '50000' });
    setProspectOpen(false);
    toast.success('Prospect créé');
  };

  const convertClient = async (row) => {
    await onUpdateClient?.(row.id, buildProspectConversionPatch({ toClient: true }));
    toast.success('Prospect converti en client actif');
  };

  const convertQuote = async (row) => {
    try {
      const { records } = prepareCommercialQuoteCommit({
        form: {
          date: new Date().toISOString().slice(0, 10),
          client_id: row.id,
          source_type: 'service',
          product_name: row.interest || 'Devis prospect',
          quantity: 1,
          unit: 'forfait',
          unit_price: row.estimatedNeed || 0,
        },
        clientLabel: row.name,
        farmScope,
        accessibleFarms,
        activeFarm,
      });
      await onCreateOrder?.(records.order);
      for (const item of records.items) await onCreateItem?.(item);
      await onUpdateClient?.(row.id, buildProspectConversionPatch({ toQuote: true }));
      await onRefreshWorkflow?.();
      onNewQuote?.();
      toast.success('Devis créé pour le prospect');
    } catch (e) {
      toast.error(e.message || 'Conversion devis impossible');
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line bg-white p-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-normal text-slate font-semibold">Prospects</p>
          <p className="text-sm text-slate">Parcours prospect → devis → client sans table lourde.</p>
        </div>
        <button type="button" onClick={() => setProspectOpen((open) => !open)} className="rounded-xl bg-earth px-3 py-2 text-xs font-semibold text-white"><UserPlus size={12} className="inline" /> Nouveau prospect</button>
      </section>
      {prospectOpen ? (
        <section className="rounded-2xl border border-line bg-card p-4 space-y-3">
          <p className="text-sm font-semibold text-earth">Nouveau prospect</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Nom *</span>
              <input type="text" value={prospectForm.name} onChange={(event) => setProspectForm((prev) => ({ ...prev, name: event.target.value }))} className="w-full rounded-xl border border-line px-3 py-2 text-sm" placeholder="Restaurant, grossiste…" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Téléphone</span>
              <input type="tel" value={prospectForm.phone} onChange={(event) => setProspectForm((prev) => ({ ...prev, phone: event.target.value }))} className="w-full rounded-xl border border-line px-3 py-2 text-sm" placeholder="+221…" />
            </label>
            <label className="block space-y-1 md:col-span-2">
              <span className="text-xs font-semibold text-slate">Intérêt produit</span>
              <select value={prospectForm.interest} onChange={(event) => setProspectForm((prev) => ({ ...prev, interest: event.target.value }))} className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm">
                {PROSPECT_INTERESTS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Besoin estimé (FCFA)</span>
              <input type="number" min="0" value={prospectForm.estimatedNeed} onChange={(event) => setProspectForm((prev) => ({ ...prev, estimatedNeed: event.target.value }))} className="w-full rounded-xl border border-line px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setProspectOpen(false)} className="rounded-xl border border-line px-3 py-2 text-xs font-semibold">Annuler</button>
            <button type="button" onClick={createProspect} className="rounded-xl bg-earth px-3 py-2 text-xs font-semibold text-white">Enregistrer</button>
          </div>
        </section>
      ) : null}
      <ProspectBlock title="Prospects chauds" rows={pipeline.hot} tone="hot" onConvertQuote={convertQuote} onConvertClient={convertClient} />
      <ProspectBlock title="À relancer" rows={pipeline.toFollowUp} onConvertQuote={convertQuote} onConvertClient={convertClient} />
      <ProspectBlock title="Convertis" rows={pipeline.converted} onConvertQuote={convertQuote} onConvertClient={convertClient} />
      {!pipeline.all.length ? <p className="text-sm text-center text-slate py-6">Aucun prospect - créez-en un ou passez un client en statut prospect.</p> : null}
    </div>
  );
}
