import { ChevronDown, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ANIMAL_SPECIES_TABS, countAnimalsBySpecies, filterAnimalsBySpecies, restoreSpeciesOnAnimalPayload } from '../utils/animalSpecies';
import AnimalCostOverview from './AnimalCostOverview.jsx';
import AnimalSlaughterStockBridge from './AnimalSlaughterStockBridge.jsx';
import AnimauxEvolution from './AnimauxEvolution.jsx';
import AnimauxSpeciesFocused from './AnimauxSpeciesFocused.jsx';
import DirectChargesBridge from './DirectChargesBridge.jsx';
import GrowthPerformanceOverview from './GrowthPerformanceOverview.jsx';
import LifecycleHistoryPanel from './LifecycleHistoryPanel.jsx';

function AdvancedSection({ title, description, open, onToggle, children }) {
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white shadow-sm overflow-hidden">
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between gap-3 p-5 text-left">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456]">Analyse avancée</p>
          <h3 className="text-lg font-black text-[#2f2415]">{title}</h3>
          <p className="mt-1 text-sm text-[#8a7456]">{description}</p>
        </div>
        {open ? <ChevronDown className="text-[#8a7456]" /> : <ChevronRight className="text-[#8a7456]" />}
      </button>
      {open ? <div className="border-t border-[#eadcc2] p-5 space-y-6 bg-[#fffdf8]/40">{children}</div> : null}
    </section>
  );
}

export default function AnimauxV2(props) {
  const [species, setSpecies] = useState('Bovin');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const counts = useMemo(() => countAnimalsBySpecies(props.rows || []), [props.rows]);
  const speciesRows = useMemo(() => filterAnimalsBySpecies(props.rows || [], species), [props.rows, species]);
  const wrapCreate = async (payload) => props.onCreate?.(restoreSpeciesOnAnimalPayload(payload, species));
  const wrapUpdate = async (id, payload) => props.onUpdate?.(id, restoreSpeciesOnAnimalPayload(payload, species));

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[#d6c3a0] bg-white p-4 shadow-sm">
        <p className="text-xs uppercase tracking-widest text-[#8a7456]">Filtre cheptel</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {ANIMAL_SPECIES_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setSpecies(tab)}
              className={`rounded-2xl border px-4 py-3 text-left transition-all ${species === tab ? 'bg-[#2f2415] text-white border-[#2f2415]' : 'bg-white text-[#8a7456] border-[#d6c3a0]'}`}
            >
              <p className="text-xs uppercase tracking-wide">Espèce</p>
              <p className="font-black">{tab}s</p>
              <p className="text-xs opacity-75">{counts[tab] || 0} animaux</p>
            </button>
          ))}
        </div>
      </div>

      <AnimauxSpeciesFocused
        {...props}
        species={species}
        rows={speciesRows}
        onCreate={wrapCreate}
        onUpdate={wrapUpdate}
      />

      <AdvancedSection
        title={`${species}s : historique, coûts, croissance, charges, abattage et évolution`}
        description="Les analyses détaillées sont regroupées ici pour éviter les doublons dans la lecture principale. Les graphes d’évolution sont conservés."
        open={showAdvanced}
        onToggle={() => setShowAdvanced((value) => !value)}
      >
        <LifecycleHistoryPanel
          mode="animaux"
          rows={speciesRows}
          salesOrders={props.salesOrders || []}
          deliveries={props.deliveriesList || props.deliveries || []}
          businessEvents={props.businessEvents || []}
        />
        <AnimalCostOverview
          rows={speciesRows}
          alimentationLogs={props.alimentationLogs || []}
          vaccins={props.vaccins || []}
          businessEvents={props.businessEvents || []}
        />
        <GrowthPerformanceOverview
          mode="animaux"
          rows={speciesRows}
          alimentationLogs={props.alimentationLogs || []}
          vaccins={props.vaccins || []}
          businessEvents={props.businessEvents || []}
        />
        <AnimalSlaughterStockBridge
          rows={speciesRows}
          alimentationLogs={props.alimentationLogs || []}
          vaccins={props.vaccins || []}
          businessEvents={props.businessEvents || []}
          onUpdate={props.onUpdate}
          onRefresh={props.onRefresh}
          onCreateBusinessEvent={props.onCreateBusinessEvent}
          onRefreshBusinessEvents={props.onRefreshBusinessEvents}
        />
        <DirectChargesBridge
          title={`Autres charges directes ${species.toLowerCase()}s`}
          subtitle="Ajoute les frais exceptionnels liés à un animal précis : transport, traitement spécial, abattage, emballage, etc."
          targetType="animaux"
          targets={speciesRows}
          businessEvents={props.businessEvents || []}
          onCreateBusinessEvent={props.onCreateBusinessEvent}
          onUpdateBusinessEvent={props.onUpdateBusinessEvent}
          onDeleteBusinessEvent={props.onDeleteBusinessEvent}
          onRefreshBusinessEvents={props.onRefreshBusinessEvents}
        />
        <AnimauxEvolution
          rows={speciesRows}
          alimentationLogs={props.alimentationLogs || []}
          vaccins={props.vaccins || []}
          businessEvents={props.businessEvents || []}
          opportunities={props.opportunities || []}
          onNavigate={props.onNavigate}
        />
      </AdvancedSection>
    </div>
  );
}
