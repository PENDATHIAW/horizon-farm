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

  const Block = ({ title, rows, tone = 'neutral' }) => {
    if (!rows.length) return null;
    return (
      <section className={`rounded-2xl border p-4 ${tone === 'hot' ? 'border-red-200 bg-red-50/30' : 'border-[#eadcc2] bg-white'}`}>
        <p className="text-sm font-black text-[#2f2415] mb-2">{title} ({rows.length})</p>
        <div className="space-y-2">
          {rows.slice(0, 6).map((row) => (
            <div key={row.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <p className="font-black text-[#2f2415]">{row.name}</p>
                <p className="text-xs text-[#8a7456]">{row.source || 'Source ?'} · {row.interest || '—'} · prob. {row.probability || 0}% · {fmtCurrency(row.estimatedNeed)}</p>
                <p className="text-[11px] text-[#9a6b12]">{row.nextAction || 'Prochaine action à définir'}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                <button type="button" onClick={() => convertQuote(row)} className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-black text-sky-800"><FileText size={12} className="inline" /> Devis</button>
                <button type="button" onClick={() => convertClient(row)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-800"><ArrowRightCircle size={12} className="inline" /> Client</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black">Prospects</p>
          <p className="text-sm text-[#8a7456]">Parcours prospect → devis → client sans table lourde.</p>
        </div>
        <button type="button" onClick={() => setProspectOpen((open) => !open)} className="rounded-xl bg-[#2f2415] px-3 py-2 text-xs font-black text-white"><UserPlus size={12} className="inline" /> Nouveau prospect</button>
      </section>
      {prospectOpen ? (
        <section className="rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] p-4 space-y-3">
          <p className="text-sm font-black text-[#2f2415]">Nouveau prospect</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-bold text-[#8a7456]">Nom *</span>
              <input type="text" value={prospectForm.name} onChange={(event) => setProspectForm((prev) => ({ ...prev, name: event.target.value }))} className="w-full rounded-xl border border-[#d6c3a0] px-3 py-2 text-sm" placeholder="Restaurant, grossiste…" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold text-[#8a7456]">Téléphone</span>
              <input type="tel" value={prospectForm.phone} onChange={(event) => setProspectForm((prev) => ({ ...prev, phone: event.target.value }))} className="w-full rounded-xl border border-[#d6c3a0] px-3 py-2 text-sm" placeholder="+221…" />
            </label>
            <label className="block space-y-1 md:col-span-2">
              <span className="text-xs font-bold text-[#8a7456]">Intérêt produit</span>
              <select value={prospectForm.interest} onChange={(event) => setProspectForm((prev) => ({ ...prev, interest: event.target.value }))} className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm">
                {PROSPECT_INTERESTS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold text-[#8a7456]">Besoin estimé (FCFA)</span>
              <input type="number" min="0" value={prospectForm.estimatedNeed} onChange={(event) => setProspectForm((prev) => ({ ...prev, estimatedNeed: event.target.value }))} className="w-full rounded-xl border border-[#d6c3a0] px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setProspectOpen(false)} className="rounded-xl border border-[#d6c3a0] px-3 py-2 text-xs font-black">Annuler</button>
            <button type="button" onClick={createProspect} className="rounded-xl bg-[#2f2415] px-3 py-2 text-xs font-black text-white">Enregistrer</button>
          </div>
        </section>
      ) : null}
      <Block title="Prospects chauds" rows={pipeline.hot} tone="hot" />
      <Block title="À relancer" rows={pipeline.toFollowUp} />
      <Block title="Convertis" rows={pipeline.converted} />
      {!pipeline.all.length ? <p className="text-sm text-center text-[#8a7456] py-6">Aucun prospect — créez-en un ou passez un client en statut prospect.</p> : null}
    </div>
  );
}
