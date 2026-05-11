import { useMemo, useState } from 'react';
import ImpactDomainDeepSignals from './ImpactDomainDeepSignals.jsx';
import ImpactFarmValueBridgeV5 from './ImpactFarmValueBridgeV5.jsx';
import ImpactBusinessStrategicV5 from './ImpactBusinessStrategicV5.jsx';

const arr = (value) => Array.isArray(value) ? value : [];
const riskHealth = ['malade', 'sous_traitement', 'critique', 'urgence', 'traitement'];
const lower = (value) => String(value || '').trim().toLowerCase();

function normalizeAnimalHealthForImpact(animal = {}) {
  const health = lower(animal.health_status || animal.statut_sante || animal.sante_status || animal.etat_sante);
  const isRisk = riskHealth.some((term) => health.includes(term));
  if (!isRisk) return animal;
  return {
    ...animal,
    status: animal.status === 'vendu' ? animal.status : health,
    statut: animal.statut === 'vendu' ? animal.statut : health,
    impact_health_status: health,
  };
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-bold border ${active ? 'bg-[#2f2415] text-white border-[#2f2415]' : 'bg-white text-[#7d6a4a] border-[#d6c3a0]'}`}
    >
      {children}
    </button>
  );
}

export default function ImpactBusinessShell(props) {
  const [tab, setTab] = useState('pilotage');
  const impactProps = useMemo(() => ({ ...props, animaux: arr(props.animaux).map(normalizeAnimalHealthForImpact) }), [props]);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <TabButton active={tab === 'pilotage'} onClick={() => setTab('pilotage')}>Pilotage stratégique</TabButton>
        <TabButton active={tab === 'domaines'} onClick={() => setTab('domaines')}>Domaines maîtrisés</TabButton>
      </div>
      {tab === 'pilotage' ? <ImpactBusinessStrategicV5 {...impactProps} embedded /> : null}
      {tab === 'domaines' ? (
        <div className="space-y-5">
          <ImpactDomainDeepSignals {...impactProps} />
          <ImpactFarmValueBridgeV5 {...impactProps} />
        </div>
      ) : null}
    </div>
  );
}
