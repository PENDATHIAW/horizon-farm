import { useState } from 'react';
import SectionHeader from '../components/SectionHeader';
import ImpactDomainDeepSignals from './ImpactDomainDeepSignals.jsx';
import ImpactFarmValueBridgeV5 from './ImpactFarmValueBridgeV5.jsx';
import ImpactBusinessStrategicV5 from './ImpactBusinessStrategicV5.jsx';

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

  return (
    <div className="space-y-6">
      {tab === 'domaines' ? (
        <SectionHeader
          title="Impact & Valeur ERP"
          sub="Voir ce que l’ERP permet de maîtriser, décider et prouver dans la ferme."
        />
      ) : null}

      <div className="flex flex-wrap gap-2">
        <TabButton active={tab === 'pilotage'} onClick={() => setTab('pilotage')}>Pilotage stratégique</TabButton>
        <TabButton active={tab === 'domaines'} onClick={() => setTab('domaines')}>Domaines maîtrisés</TabButton>
      </div>

      {tab === 'pilotage' ? <ImpactBusinessStrategicV5 {...props} embedded /> : null}
      {tab === 'domaines' ? (
        <div className="space-y-5">
          <ImpactDomainDeepSignals {...props} />
          <ImpactFarmValueBridgeV5 {...props} />
        </div>
      ) : null}
    </div>
  );
}
