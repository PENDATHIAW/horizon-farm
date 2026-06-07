import { useMemo, useState } from 'react';
import { fmtCurrency, fmtNumber } from '../../utils/format';
import { simulateMaraichageSandbox } from '../../services/objectifsDecision/objectifsDecisionEngine.js';

function Section({ title, subtitle, children }) {
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div>
        <h3 className="text-lg font-black text-[#2f2415]">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function CroissanceCapacitesTab({ plan = {}, onNavigate }) {
  const breakEven = plan.breakEven || {};
  const sanitary = plan.sanitaryAlerts || [];
  const [sandbox, setSandbox] = useState({
    baseCharges: 450000,
    extraCharges: 0,
    yieldKg: 500,
    marketPriceA: 900,
    marketPriceB: 700,
    costPerKg: 420,
  });

  const simulation = useMemo(() => simulateMaraichageSandbox(sandbox), [sandbox]);

  const set = (key, value) => setSandbox((prev) => ({ ...prev, [key]: num(value) }));

  return (
    <div className="space-y-6">
      <Section
        title="Seuil de rentabilité mensuel"
        subtitle={`Calcul au ${breakEven.computedOnDay || 28} du mois — CA nécessaire pour couvrir charges fixes + variables et atteindre la marge nette cible.`}
      >
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <Card label="Charges fixes / mois" value={fmtCurrency(breakEven.fixedMonthly)} />
          <Card label="Charges variables / mois" value={fmtCurrency(breakEven.variableMonthly)} />
          <Card label="Seuil rentabilité (CA)" value={fmtCurrency(breakEven.breakEvenCa)} highlight />
          <Card label="CA cible marge nette" value={fmtCurrency(breakEven.targetCaForNetMargin)} highlight />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className={`rounded-xl border p-3 ${breakEven.isProfitable ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
            CA réalisé mois : <b>{fmtCurrency(breakEven.caRealizedMonth)}</b>
          </div>
          <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
            Écart seuil : <b>{fmtCurrency(breakEven.gapToBreakEven)}</b>
          </div>
          <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
            Écart objectif net : <b>{fmtCurrency(breakEven.gapToNetTarget)}</b>
          </div>
        </div>
        <button type="button" onClick={() => onNavigate?.('finance_pilotage', { tab: 'Rentabilité' })} className="text-xs font-black text-[#9a6b12]">
          Détail Finance & Pilotage →
        </button>
      </Section>

      <Section
        title="Vide sanitaire & capacités bâtiment"
        subtitle="Alerte bloquante si moins de 10 jours entre deux lots dans le même bâtiment."
      >
        {sanitary.length ? (
          <div className="space-y-2">
            {sanitary.map((alert) => (
              <div key={alert.id} className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                <b>Bloquant</b> — {alert.message}
                <button type="button" onClick={() => onNavigate?.('elevage', { tab: 'Cycles' })} className="ml-2 text-xs font-black underline">
                  Planifier cycle
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-emerald-700 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            Aucune violation de vide sanitaire détectée sur les bâtiments suivis.
          </p>
        )}
      </Section>

      <Section
        title="Sandbox Maraîchage (atelier futur)"
        subtitle="Simulez charges fictives, rendement et impact marge selon le lieu de vente (Marché A vs Marché B) et la période de récolte."
      >
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
          <Field label="Charges de base" value={sandbox.baseCharges} onChange={(v) => set('baseCharges', v)} />
          <Field label="Charges fictives +" value={sandbox.extraCharges} onChange={(v) => set('extraCharges', v)} />
          <Field label="Récolte (kg)" value={sandbox.yieldKg} onChange={(v) => set('yieldKg', v)} />
          <Field label="Coût/kg" value={sandbox.costPerKg} onChange={(v) => set('costPerKg', v)} />
          <Field label="Marché A (FCFA/kg)" value={sandbox.marketPriceA} onChange={(v) => set('marketPriceA', v)} />
          <Field label="Marché B (FCFA/kg)" value={sandbox.marketPriceB} onChange={(v) => set('marketPriceB', v)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SimCard title="Marché A" data={simulation.marketA} breakEvenKg={simulation.breakEvenKgA} />
          <SimCard title="Marché B" data={simulation.marketB} breakEvenKg={simulation.breakEvenKgB} />
        </div>
        <p className="text-xs text-[#8a7456]">
          Coût total simulé : {fmtCurrency(simulation.totalCost)} · Comparez avant d&apos;ouvrir une campagne maraîchage réelle.
        </p>
      </Section>
    </div>
  );
}

function num(v) { return Number(v || 0) || 0; }

function Card({ label, value, highlight = false }) {
  return (
    <div className={`rounded-2xl border p-3 ${highlight ? 'border-[#9a6b12] bg-[#fff8e8]' : 'border-[#eadcc2] bg-[#fffdf8]'}`}>
      <p className="text-[10px] text-[#8a7456]">{label}</p>
      <p className="text-lg font-black text-[#2f2415]">{value}</p>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label className="space-y-1 text-xs">
      <span className="text-[#8a7456]">{label}</span>
      <input type="number" className="w-full rounded-lg border border-[#d6c3a0] px-2 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function SimCard({ title, data, breakEvenKg }) {
  const positive = data.margin >= 0;
  return (
    <div className={`rounded-2xl border p-4 ${positive ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
      <p className="font-black text-[#2f2415]">{title}</p>
      <p className="text-sm mt-2">Prix : {fmtCurrency(data.price)}/kg · CA : {fmtCurrency(data.revenue)}</p>
      <p className="text-sm">Marge : <b>{fmtCurrency(data.margin)}</b></p>
      {breakEvenKg ? <p className="text-xs mt-1 text-[#8a7456]">Seuil volume : {fmtNumber(breakEvenKg)} kg</p> : null}
    </div>
  );
}
