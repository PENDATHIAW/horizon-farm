import { ArrowRight, BookOpen, Calculator, HelpCircle, List, Settings2 } from 'lucide-react';
import {
  ACRONYM_GLOSSARY,
  DECISION_METHODOLOGY_SECTIONS,
  FORMULA_CATEGORIES,
  buildAnnexeSnapshot,
  formulasGroupedByCategory,
} from '../../services/decisionMethodology.js';
import { resolveAnnexeLink } from '../../services/annexeNavigation.js';

function WhereCell({ where, onNavigate }) {
  const link = resolveAnnexeLink(where);
  if (link && onNavigate) {
    return (
      <button
        type="button"
        onClick={() => onNavigate(link.module, { tab: link.tab })}
        className="inline-flex items-center gap-1 text-left font-semibold text-positive hover:text-positive hover:underline"
      >
        {where}
        <ArrowRight size={12} className="shrink-0" />
      </button>
    );
  }
  return <span>{where}</span>;
}

function ParamTable({ rows = [], onNavigate }) {
  if (!rows.length) return null;
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-line">
      <table className="w-full text-left text-meta">
        <thead>
          <tr className="border-b border-line bg-card text-meta uppercase tracking-normal text-slate">
            <th className="px-3 py-2">Information</th>
            <th className="px-3 py-2">Unité</th>
            <th className="px-3 py-2">Valeur habituelle</th>
            <th className="px-3 py-2">Où le trouver (cliquer pour ouvrir)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-line/60 last:border-0">
              <td className="px-3 py-2 font-semibold text-earth">{row.label}</td>
              <td className="px-3 py-2 text-slate">{row.unit}</td>
              <td className="px-3 py-2 text-slate">{row.default}</td>
              <td className="px-3 py-2 text-slate">
                <WhereCell where={row.where} onNavigate={onNavigate} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FormulaBlock({ block, onNavigate }) {
  return (
    <section id={`annexe-${block.id}`} className="rounded-2xl border border-line bg-white p-4 shadow-card scroll-mt-12">
      <p className="font-semibold text-earth text-sm flex items-center gap-2">
        <Calculator size={15} className="text-positive" /> {block.title}
      </p>
      {block.summary ? (
        <p className="mt-2 text-sm text-slate leading-relaxed bg-card rounded-xl border border-line px-3 py-2">
          {block.summary}
        </p>
      ) : null}
      <div className="mt-3 rounded-xl border border-line bg-card p-4 text-sm text-earth leading-relaxed whitespace-pre-wrap">
        {block.formula}
      </div>
      <ParamTable rows={block.parameters} onNavigate={onNavigate} />
      {block.outputs?.length ? (
        <p className="mt-3 text-xs text-slate">
          <b className="text-earth">Ce que vous voyez à l&apos;écran :</b>{' '}
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
  onNavigate,
}) {
  const grouped = formulasGroupedByCategory(moduleId);
  const snapshot = buildAnnexeSnapshot(dataMap);
  const formulasCount = grouped.reduce((n, g) => n + g.blocks.length, 0);
  const categoryLabel = Object.fromEntries(FORMULA_CATEGORIES.map((c) => [c.id, c.label]));

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-line bg-card p-6">
        <p className="text-xs uppercase tracking-normal text-slate font-semibold flex items-center gap-2">
          <BookOpen size={15} /> Annexe - comment on calcule
        </p>
        <h2 className="text-xl font-semibold text-earth mt-1">{moduleLabel} : guide en langage simple</h2>
        <p className="text-sm text-slate mt-1">
          {formulasCount} explications sans jargon. Les lignes vertes dans « Où le trouver » ouvrent le bon module ERP en un clic
          {onNavigate ? '' : ' (navigation indisponible dans cette vue)'}.
        </p>
      </section>

      <section className="rounded-2xl border border-vigilance bg-vigilance-bg p-4">
        <p className="font-semibold text-horizon-dark flex items-center gap-2 text-sm">
          <HelpCircle size={15} /> Sigles et mots utiles - lire en premier
        </p>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          {ACRONYM_GLOSSARY.map((row) => (
            <div key={row.term} className="rounded-xl border border-vigilance bg-white px-3 py-2">
              <p className="text-xs font-semibold text-horizon-dark">{row.term}</p>
              <p className="text-meta text-slate mt-1 leading-relaxed">{row.definition}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-4">
        <p className="font-semibold text-earth text-sm flex items-center gap-2">
          <Settings2 size={15} /> Vos réglages actuels
        </p>
        <p className="text-xs text-slate mt-1">
          Modifiables dans le bandeau « Paramètres pilotage » en haut du Centre décisionnel.
          {onNavigate ? (
            <>
              {' '}
              <button
                type="button"
                onClick={() => onNavigate('centre_ia', { tab: 'À traiter' })}
                className="font-semibold text-positive hover:underline"
              >
                Aller au Centre →
              </button>
            </>
          ) : null}
        </p>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
          {snapshot.pilotage.map((row) => (
            <div key={row.key} className="rounded-xl border border-line bg-card px-3 py-2">
              <p className="text-meta text-slate">{row.label}</p>
              <p className="text-sm font-semibold text-earth">
                {row.value}
                {row.unit === 'jours' || row.unit === '%' ? ` ${row.unit}` : row.unit === 'sujets' ? ' sujets' : ''}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-positive bg-positive-bg p-4">
        <p className="font-semibold text-positive flex items-center gap-2 text-sm">
          <List size={15} /> Sommaire ({formulasCount} sujets)
        </p>
        <div className="mt-3 space-y-3">
          {grouped.map((group) => (
            <div key={group.id}>
              <p className="text-meta font-semibold uppercase tracking-normal text-positive">
                {group.label} ({group.blocks.length})
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                {group.blocks.map((block) => (
                  <a
                    key={block.id}
                    href={`#annexe-${block.id}`}
                    className="rounded-lg border border-positive bg-white px-2 py-1 text-meta text-positive hover:bg-positive-bg"
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
            <h3 className="text-sm font-semibold uppercase tracking-normal text-slate border-b border-line pb-2">
              {categoryLabel[group.id] || group.label}
            </h3>
            {group.blocks.map((block) => (
              <FormulaBlock key={block.id} block={block} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {DECISION_METHODOLOGY_SECTIONS.map((section) => (
          <section key={section.id} className="rounded-2xl border border-line bg-card p-4 space-y-2">
            <h3 className="font-semibold text-earth text-sm">{section.title}</h3>
            <ul className="space-y-2">
              {section.items.map((line) => (
                <li key={line} className="text-xs text-slate leading-relaxed flex gap-2">
                  <span className="text-positive shrink-0">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="rounded-2xl border border-line bg-white p-4">
        <p className="font-semibold text-earth text-sm">Dates des fêtes (calcul automatique)</p>
        <p className="text-xs text-slate mt-1">Corrigibles dans Paramètres pilotage (Centre décisionnel).</p>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
          {snapshot.festivals.map((fest) => (
            <div key={fest.key} className="rounded-xl border border-line px-3 py-2 text-xs">
              <span className="font-semibold text-earth">{fest.label}</span>
              <span className="text-slate"> - règle calendrier : </span>
              <span className="text-slate">jour {fest.rule}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
