import { BookOpen, Calculator, HelpCircle, List, Settings2 } from 'lucide-react';
import {
  ACRONYM_GLOSSARY,
  DECISION_METHODOLOGY_SECTIONS,
  FORMULA_CATEGORIES,
  buildAnnexeSnapshot,
  formulasGroupedByCategory,
} from '../../services/decisionMethodology.js';

function ParamTable({ rows = [] }) {
  if (!rows.length) return null;
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-[#eadcc2]">
      <table className="w-full text-left text-[11px]">
        <thead>
          <tr className="border-b border-[#eadcc2] bg-[#fffdf8] text-[10px] uppercase tracking-wide text-[#8a7456]">
            <th className="px-3 py-2">Information</th>
            <th className="px-3 py-2">Unité</th>
            <th className="px-3 py-2">Valeur habituelle</th>
            <th className="px-3 py-2">Où le trouver dans l&apos;ERP</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-[#eadcc2]/60 last:border-0">
              <td className="px-3 py-2 font-black text-[#2f2415]">{row.label}</td>
              <td className="px-3 py-2 text-[#7d6a4a]">{row.unit}</td>
              <td className="px-3 py-2 text-[#7d6a4a]">{row.default}</td>
              <td className="px-3 py-2 text-[#7d6a4a]">{row.where}</td>
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
      {block.summary ? (
        <p className="mt-2 text-sm text-[#5c4a32] leading-relaxed bg-[#fffdf8] rounded-xl border border-[#eadcc2] px-3 py-2">
          {block.summary}
        </p>
      ) : null}
      <div className="mt-3 rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#2f2415] leading-relaxed whitespace-pre-wrap">
        {block.formula}
      </div>
      <ParamTable rows={block.parameters} />
      {block.outputs?.length ? (
        <p className="mt-3 text-xs text-[#7d6a4a]">
          <b className="text-[#2f2415]">Ce que vous voyez à l&apos;écran :</b>{' '}
          {block.outputs.join(' · ')}
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
  const grouped = formulasGroupedByCategory(moduleId);
  const snapshot = buildAnnexeSnapshot(dataMap);
  const formulasCount = grouped.reduce((n, g) => n + g.blocks.length, 0);
  const categoryLabel = Object.fromEntries(FORMULA_CATEGORIES.map((c) => [c.id, c.label]));

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5">
        <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2">
          <BookOpen size={15} /> Annexe — comment on calcule
        </p>
        <h2 className="text-xl font-black text-[#2f2415] mt-1">{moduleLabel} : guide en langage simple</h2>
        <p className="text-sm text-[#8a7456] mt-1">
          {formulasCount} explications sans jargon technique. Commencez par le dictionnaire des sigles ci-dessous si un mot vous semble obscur (BFR, J+40, ITH…).
        </p>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="font-black text-amber-950 flex items-center gap-2 text-sm">
          <HelpCircle size={15} /> Sigles et mots utiles — lire en premier
        </p>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          {ACRONYM_GLOSSARY.map((row) => (
            <div key={row.term} className="rounded-xl border border-amber-200 bg-white px-3 py-2">
              <p className="text-xs font-black text-amber-900">{row.term}</p>
              <p className="text-[11px] text-[#5c4a32] mt-0.5 leading-relaxed">{row.definition}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#eadcc2] bg-white p-4">
        <p className="font-black text-[#2f2415] text-sm flex items-center gap-2">
          <Settings2 size={15} /> Vos réglages actuels (paramètres pilotage)
        </p>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
          {snapshot.pilotage.map((row) => (
            <div key={row.key} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2">
              <p className="text-[10px] text-[#8a7456]">{row.label}</p>
              <p className="text-sm font-black text-[#2f2415]">
                {row.value}
                {row.unit === 'jours' || row.unit === '%' ? ` ${row.unit}` : row.unit === 'sujets' ? ' sujets' : ''}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[#7d6a4a]">
          Objectif annuel de ventes : <b>{String(snapshot.growthSettings.annual_ca_target)}</b> ·
          Marge brute visée : <b>{snapshot.growthSettings.target_gross_margin_pct} %</b> ·
          Marge nette visée : <b>{snapshot.growthSettings.target_net_margin_pct} %</b> ·
          Clients VIP comptés pour la trésorerie : <b>{snapshot.growthSettings.vip_count}</b>
        </p>
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="font-black text-emerald-900 flex items-center gap-2 text-sm">
          <List size={15} /> Sommaire ({formulasCount} sujets)
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
                    className="rounded-lg border border-emerald-200 bg-white px-2 py-1 text-[10px] text-emerald-900 hover:bg-emerald-100"
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
            <h3 className="font-black text-[#2f2415] text-sm">{section.title}</h3>
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

      <section className="rounded-2xl border border-[#eadcc2] bg-white p-4">
        <p className="font-black text-[#2f2415] text-sm">Dates des fêtes (calcul automatique)</p>
        <p className="text-xs text-[#8a7456] mt-1">Vous pouvez les corriger dans Paramètres pilotage si la date locale diffère.</p>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
          {snapshot.festivals.map((fest) => (
            <div key={fest.key} className="rounded-xl border border-[#eadcc2] px-3 py-2 text-xs">
              <span className="font-black text-[#2f2415]">{fest.label}</span>
              <span className="text-[#7d6a4a]"> — règle calendrier : </span>
              <span className="text-[#5c4a32]">jour {fest.rule}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
