import { BookOpen, Calculator, HelpCircle, List, Settings2 } from 'lucide-react';
import {
  DECISION_METHODOLOGY_SECTIONS,
  ENTITY_GLOSSARY,
  FORMULA_CATEGORIES,
  buildAnnexeSnapshot,
  formulasForModule,
  formulasGroupedByCategory,
} from '../../services/decisionMethodology.js';

function ParamTable({ rows = [] }) {
  if (!rows.length) return null;
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-[#eadcc2]">
      <table className="w-full text-left text-[11px]">
        <thead>
          <tr className="border-b border-[#eadcc2] bg-[#fffdf8] text-[10px] uppercase tracking-wide text-[#8a7456]">
            <th className="px-3 py-2">Paramètre</th>
            <th className="px-3 py-2">Libellé</th>
            <th className="px-3 py-2">Unité</th>
            <th className="px-3 py-2">Défaut</th>
            <th className="px-3 py-2">Source données</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-b border-[#eadcc2]/60 last:border-0">
              <td className="px-3 py-2 font-mono font-black text-emerald-800">{row.name}</td>
              <td className="px-3 py-2 text-[#2f2415]">{row.label}</td>
              <td className="px-3 py-2 text-[#7d6a4a]">{row.unit}</td>
              <td className="px-3 py-2 text-[#7d6a4a]">{row.default}</td>
              <td className="px-3 py-2 text-[#7d6a4a] font-mono text-[10px]">{row.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FormulaBlock({ block }) {
  return (
    <section id={`annexe-${block.id}`} className="rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm scroll-mt-24">
      <p className="font-black text-[#2f2415] text-sm flex items-center gap-2">
        <Calculator size={15} className="text-emerald-700" /> {block.title}
      </p>
      <pre className="mt-3 overflow-x-auto rounded-xl border border-[#2f2415]/10 bg-[#2f2415] p-4 text-[11px] leading-relaxed text-emerald-100 font-mono whitespace-pre-wrap">
        {block.formula}
      </pre>
      <ParamTable rows={block.parameters} />
      {block.outputs?.length ? (
        <p className="mt-3 text-[11px] text-[#7d6a4a]">
          <b className="text-[#2f2415]">Sorties moteur :</b>{' '}
          <span className="font-mono text-emerald-800">{block.outputs.join(' · ')}</span>
        </p>
      ) : null}
    </section>
  );
}

export default function DecisionAnnexeTab({
  moduleLabel = 'Centre décisionnel',
  moduleId = 'centre_ia',
  dataMap = {},
}) {
  const formulas = formulasForModule(moduleId);
  const grouped = formulasGroupedByCategory(moduleId);
  const snapshot = buildAnnexeSnapshot(dataMap);
  const categoryLabel = Object.fromEntries(FORMULA_CATEGORIES.map((c) => [c.id, c.label]));

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5">
        <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2">
          <BookOpen size={15} /> Annexe — formules & paramètres
        </p>
        <h2 className="text-xl font-black text-[#2f2415] mt-1">{moduleLabel} : méthode de calcul</h2>
        <p className="text-sm text-[#8a7456] mt-1">
          Documentation exhaustive : {formulas.length} calculs documentés avec formule exacte, noms de variables du code, sources ERP et valeurs par défaut.
        </p>
      </section>

      <section className="rounded-2xl border border-[#eadcc2] bg-white p-4">
        <p className="font-black text-[#2f2415] text-sm flex items-center gap-2">
          <Settings2 size={15} /> Paramètres pilotage actifs
        </p>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
          {snapshot.pilotage.map((row) => (
            <div key={row.key} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2">
              <p className="text-[10px] text-[#8a7456]">{row.label}</p>
              <p className="font-mono text-sm font-black text-[#2f2415]">
                {row.value}
                {row.unit !== '—' && row.unit !== 'sujets' ? row.unit : ''}
                {row.unit === 'sujets' || row.unit === 'j' || row.unit === '%' ? ` ${row.unit}` : ''}
              </p>
              <p className="text-[10px] text-[#8a7456] mt-0.5">growth_settings.{row.key}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[#7d6a4a]">
          Objectif annuel : <b className="font-mono">{String(snapshot.growthSettings.annual_ca_target)}</b> ·
          Marge brute cible : <b className="font-mono">{snapshot.growthSettings.target_gross_margin_pct}%</b> ·
          Marge nette cible : <b className="font-mono">{snapshot.growthSettings.target_net_margin_pct}%</b> ·
          VIP BFR : <b className="font-mono">{snapshot.growthSettings.vip_count}</b> client(s)
        </p>
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="font-black text-emerald-900 flex items-center gap-2 text-sm">
          <List size={15} /> Sommaire des calculs ({formulas.length})
        </p>
        <div className="mt-3 space-y-3">
          {grouped.map((group) => (
            <div key={group.id}>
              <p className="text-[11px] font-black uppercase tracking-wide text-emerald-800">
                {group.label} ({group.blocks.length})
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {group.blocks.map((block) => (
                  <a
                    key={block.id}
                    href={`#annexe-${block.id}`}
                    className="rounded-lg border border-emerald-200 bg-white px-2 py-1 text-[10px] font-mono text-emerald-900 hover:bg-emerald-100"
                  >
                    {block.title}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-6">
        {grouped.map((group) => (
          <div key={group.id} className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wide text-[#8a7456] border-b border-[#eadcc2] pb-2">
              {categoryLabel[group.id] || group.label}
            </h3>
            {group.blocks.map((block) => (
              <FormulaBlock key={block.id} block={block} />
            ))}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {DECISION_METHODOLOGY_SECTIONS.map((section) => (
          <section key={section.id} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 space-y-2">
            <h3 className="font-black text-[#2f2415] text-sm">{section.title} — rappel</h3>
            <ul className="space-y-1.5">
              {section.items.map((line) => (
                <li key={line} className="text-xs text-[#7d6a4a] leading-relaxed flex gap-2">
                  <span className="text-emerald-700 shrink-0">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="font-black text-emerald-900 flex items-center gap-2 text-sm">
          <HelpCircle size={15} /> Glossaire des identifiants
        </p>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          {ENTITY_GLOSSARY.map((row) => (
            <div key={row.term} className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
              <p className="text-xs font-mono font-black text-emerald-800">{row.term}</p>
              <p className="text-[11px] text-[#7d6a4a] mt-0.5">{row.definition}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#eadcc2] bg-white p-4">
        <p className="font-black text-[#2f2415] text-sm">Règles hijri des fêtes (paramètres fixes)</p>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
          {snapshot.festivals.map((fest) => (
            <div key={fest.key} className="rounded-xl border border-[#eadcc2] px-3 py-2 text-xs">
              <span className="font-black text-[#2f2415]">{fest.label}</span>
              <span className="text-[#7d6a4a]"> — clé </span>
              <span className="font-mono text-emerald-800">{fest.key}</span>
              <span className="text-[#7d6a4a]"> · </span>
              <span className="font-mono">{fest.rule}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
