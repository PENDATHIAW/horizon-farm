import { useMemo, useState } from 'react';
import ImpactDomainDeepSignals from './ImpactDomainDeepSignals.jsx';
import ImpactFarmValueBridgeV5 from './ImpactFarmValueBridgeV5.jsx';
import ImpactBusinessStrategicV5 from './ImpactBusinessStrategicV5.jsx';

const arr = (value) => Array.isArray(value) ? value : [];
const riskHealth = ['malade', 'sous_traitement', 'sous traitement', 'critique', 'urgence', 'traitement', 'a_traiter', 'à traiter', 'maladie'];
const goodHealth = ['sain', 'saine', 'ok', 'bonne', 'bon', 'normal'];
const lower = (value) => String(value || '').trim().toLowerCase();

function pickHealthStatus(animal = {}) {
  const candidates = [
    animal.health_status,
    animal.statut_sante,
    animal.sante_status,
    animal.etat_sante,
    animal.impact_health_status,
    animal.health,
  ].map(lower).filter(Boolean);
  const risk = candidates.find((value) => riskHealth.some((term) => value.includes(term)));
  if (risk) return risk;
  const good = candidates.find((value) => goodHealth.some((term) => value.includes(term)));
  if (good) return good;
  return candidates[0] || '';
}

function normalizeAnimalHealthForImpact(animal = {}) {
  const health = pickHealthStatus(animal);
  const isRisk = riskHealth.some((term) => health.includes(term));
  const isSold = ['vendu', 'vendue', 'abattu', 'abattue', 'mort', 'morte'].includes(lower(animal.status || animal.statut));
  if (!health) return animal;
  return {
    ...animal,
    health_status: health,
    statut_sante: health,
    sante_status: health,
    etat_sante: health,
    impact_health_status: health,
    status: isRisk && !isSold ? health : animal.status,
    statut: isRisk && !isSold ? health : animal.statut,
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
