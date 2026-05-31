import { BarChart3 } from 'lucide-react';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fmtCurrency, fmtNumber } from '../../utils/format';
import { buildObjectifsCroissanceData } from '../../services/objectifsGrowthEngine.js';
import { Section, TabIntro } from './visionUtils';

function GanttBlock({ row }) {
  const cls = row.status === 'occupied' ? 'bg-sky-600' : row.status === 'vacuum' ? 'bg-slate-400' : 'bg-white border border-dashed border-[#d6c3a0]';
  return (
    <div className="flex items-center gap-3 py-2 border-b border-[#eadcc2]/70 last:border-b-0">
      <div className="w-32 shrink-0 text-xs font-black text-[#2f2415]">{row.building}</div>
      <div className="flex-1">
        <div className={`rounded-lg px-3 py-2 text-xs font-bold text-white ${cls}`}>
          {row.lot} · {row.start || '—'} → {row.end || 'en cours'}
          {row.status === 'vacuum' ? ` · vide sanitaire jusqu'au ${row.vacuumEnd}` : ''}
          {row.status === 'empty' ? ' · bâtiment inactif' : ''}
        </div>
      </div>
    </div>
  );
}

export default function VisionObjectifsGraphiquesTab(props) {
  const { graphiques } = useMemo(() => buildObjectifsCroissanceData(props), [props]);

  return (
    <div className="space-y-5">
      <TabIntro
        title="Tableau de bord graphique"
        detail="Visualisation décisionnelle — aucune saisie, données aspirées automatiquement des modules Élevage, Achats et Finance."
      />

      <Section icon={BarChart3} title="G1 — Courbe double ponte (objectif souche vs réel)">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={graphiques.g1}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eadcc2" />
              <XAxis dataKey="week" label={{ value: 'Semaines', position: 'insideBottom', offset: -4 }} />
              <YAxis domain={[0, 100]} label={{ value: 'Taux ponte %', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(v) => `${fmtNumber(v)}%`} />
              <Legend />
              <Line type="monotone" dataKey="theoretical" name="Objectif souche" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="real" name="Réel terrain" stroke="#2f2415" strokeWidth={2} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section icon={BarChart3} title="G2 — Histogramme miroir écarts de poids / GMQ (%)">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={graphiques.g2} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eadcc2" />
              <XAxis type="number" domain={[-20, 20]} />
              <YAxis type="category" dataKey="id" width={120} />
              <Tooltip formatter={(v) => `${fmtNumber(v)}%`} />
              <ReferenceLine x={0} stroke="#2f2415" />
              <Bar dataKey="devPct" name="Écart %">
                {graphiques.g2.map((entry) => (
                  <Cell key={entry.id} fill={entry.devPct >= 0 ? '#16a34a' : entry.devPct >= -5 ? '#f59e0b' : '#dc2626'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section icon={BarChart3} title="G3 — Point de bascule CA vs seuil de rentabilité (12 mois)">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={graphiques.g3}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eadcc2" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v) => fmtCurrency(v)} />
              <Legend />
              <Line type="monotone" dataKey="revenue" name="CA réel" stroke="#16a34a" strokeWidth={2} />
              <Line type="monotone" dataKey="breakEven" name="Seuil rentabilité" stroke="#dc2626" strokeWidth={2} strokeDasharray="6 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section icon={BarChart3} title="G4 — Gantt infrastructures (bleu lot · gris vide sanitaire · blanc inactif)">
        <div className="rounded-2xl border border-[#eadcc2] bg-white p-4">
          {graphiques.g4.length ? graphiques.g4.map((row) => <GanttBlock key={`${row.building}-${row.lot}`} row={row} />) : (
            <p className="text-sm text-[#8a7456]">Renseignez le bâtiment sur vos lots pour visualiser occupation et vide sanitaire.</p>
          )}
        </div>
      </Section>
    </div>
  );
}
