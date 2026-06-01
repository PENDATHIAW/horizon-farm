import { AlertTriangle, Beef, Bird, HeartPulse } from 'lucide-react';
import SanteV8 from '../SanteV8.jsx';
import { ELEVAGE_ACTION_GRID, ELEVAGE_STAT_GRID, ElevageActionCard, ElevageSection, ElevageStatCard } from './elevageUi.jsx';

export default function ElevageSantePanel({ data, healthProps, setTab }) {
  return (
    <div className="space-y-5">
      <div className={ELEVAGE_STAT_GRID}>
        <ElevageStatCard label="Soins en retard" value={data.healthLate} tone={data.healthLate ? 'warn' : 'good'} />
        <ElevageStatCard label="Mortalité lots" value={data.recentMortality} tone={data.recentMortality ? 'warn' : 'good'} />
        <ElevageStatCard label="Signaux IA" value={data.healthFindings?.length || 0} tone={data.healthFindings?.length ? 'warn' : 'good'} />
        <ElevageStatCard label="Score module" value={`${data.healthScore}/100`} tone={data.healthScore >= 75 ? 'good' : 'warn'} />
      </div>

      {(data.healthLate > 0 || data.recentMortality > 0) ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-black"><AlertTriangle size={16} /> Points de vigilance</p>
          <ul className="mt-2 space-y-1 leading-relaxed">
            {data.healthLate > 0 ? <li>{data.healthLate} soin(s) ou vaccin(s) en retard — à traiter ci-dessous.</li> : null}
            {data.recentMortality > 0 ? <li>Mortalité avicole signalée — voir aussi l’onglet Transformation pour les sorties.</li> : null}
          </ul>
        </div>
      ) : null}

      <ElevageSection title="Accès rapide" subtitle="Registres animaux et avicoles pour croiser avec les fiches santé.">
        <div className={ELEVAGE_ACTION_GRID}>
          <ElevageActionCard icon={HeartPulse} title="Soins & vaccins" text="Formulaires complets ci-dessous." onClick={() => document.getElementById('elevage-sante-crud')?.scrollIntoView({ behavior: 'smooth' })} />
          <ElevageActionCard icon={Beef} title="Cheptel animaux" text="Statut santé par animal." onClick={() => setTab('Animaux')} />
          <ElevageActionCard icon={Bird} title="Lots avicoles" text="Malades et mortalité par lot." onClick={() => setTab('Avicole')} />
        </div>
      </ElevageSection>

      <div id="elevage-sante-crud">
        <SanteV8 {...healthProps} />
      </div>
    </div>
  );
}
