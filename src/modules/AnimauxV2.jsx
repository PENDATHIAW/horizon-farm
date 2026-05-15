import { BarChart3, Beef, ClipboardList, PackageCheck, Scissors } from 'lucide-react';
import { useMemo, useState } from 'react';
import ObjectivePerformanceCard from '../components/ObjectivePerformanceCard.jsx';
import { ANIMAL_SPECIES_TABS, countAnimalsBySpecies, filterAnimalsBySpecies, restoreSpeciesOnAnimalPayload } from '../utils/animalSpecies';
import AnimalSlaughterStockBridge from './AnimalSlaughterStockBridge.jsx';
import AnimauxEvolution from './AnimauxEvolution.jsx';
import AnimauxSpeciesFocused from './AnimauxSpeciesFocused.jsx';
import DirectChargesBridge from './DirectChargesBridge.jsx';
import LifecycleHistoryPanel from './LifecycleHistoryPanel.jsx';

function ModuleSection({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div>
        <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>
        {subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function AnimauxV2(props) {
  const [species, setSpecies] = useState('Bovin');
  const counts = useMemo(() => countAnimalsBySpecies(props.rows || []), [props.rows]);
  const speciesRows = useMemo(() => filterAnimalsBySpecies(props.rows || [], species), [props.rows, species]);
  const wrapCreate = async (payload) => props.onCreate?.(restoreSpeciesOnAnimalPayload(payload, species));
  const wrapUpdate = async (id, payload) => props.onUpdate?.(id, restoreSpeciesOnAnimalPayload(payload, species));
  const dataMap = {
    sales_orders: props.salesOrders || [],
    payments: props.payments || [],
    finances: props.transactions || [],
    animaux: props.rows || [],
  };

  return (
    <div className="space-y-6 animaux-mobile-structured">
      <style>{`@media (max-width: 640px){.animaux-mobile-structured .rounded-2xl{border-radius:18px}.animaux-mobile-structured table{font-size:12px}.animaux-mobile-structured th,.animaux-mobile-structured td{padding-left:10px!important;padding-right:10px!important}.animaux-mobile-structured .text-2xl{font-size:1.35rem}.animaux-mobile-structured .grid{gap:.75rem}.animaux-mobile-structured .overflow-x-auto{max-width:100vw}}`}</style>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ObjectivePerformanceCard dataMap={dataMap} activity="bovins" title="Objectif Bovins" compact onNavigate={props.onNavigate} />
        <ObjectivePerformanceCard dataMap={dataMap} activity="ovins" title="Objectif Ovins" compact onNavigate={props.onNavigate} />
        <ObjectivePerformanceCard dataMap={dataMap} activity="caprins" title="Objectif Caprins" compact onNavigate={props.onNavigate} />
      </div>

      <ModuleSection
        icon={Beef}
        title="Cheptel par espèce"
        subtitle="Choisir une espèce pour voir uniquement les animaux concernés."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
      </ModuleSection>

      <ModuleSection
        icon={PackageCheck}
        title={`${species}s : suivi quotidien`}
        subtitle="Fiches animaux, santé, disponibilité, poids, coûts et actions utiles."
      >
        <AnimauxSpeciesFocused
          {...props}
          species={species}
          rows={speciesRows}
          onCreate={wrapCreate}
          onUpdate={wrapUpdate}
        />
      </ModuleSection>

      <ModuleSection
        icon={ClipboardList}
        title={`${species}s : cycle et historique`}
        subtitle="Entrées, sorties, ventes, pertes, clôtures et événements importants."
      >
        <LifecycleHistoryPanel
          mode="animaux"
          rows={speciesRows}
          salesOrders={props.salesOrders || []}
          deliveries={props.deliveriesList || props.deliveries || []}
          businessEvents={props.businessEvents || []}
        />
      </ModuleSection>

      <ModuleSection
        icon={PackageCheck}
        title={`${species}s : frais liés à un animal`}
        subtitle="Transport, traitement spécial, emballage, main-d’œuvre ponctuelle ou autre frais directement rattaché à un animal."
      >
        <DirectChargesBridge
          title={`Frais directs ${species.toLowerCase()}s`}
          subtitle="Ces frais améliorent le calcul du coût réel par animal."
          targetType="animaux"
          targets={speciesRows}
          businessEvents={props.businessEvents || []}
          onCreateBusinessEvent={props.onCreateBusinessEvent}
          onUpdateBusinessEvent={props.onUpdateBusinessEvent}
          onDeleteBusinessEvent={props.onDeleteBusinessEvent}
          onRefreshBusinessEvents={props.onRefreshBusinessEvents}
        />
      </ModuleSection>

      <ModuleSection
        icon={Scissors}
        title={`${species}s : abattage, transformation et stock`}
        subtitle="Sortie de l’animal, transformation éventuelle et création de stock vendable."
      >
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
      </ModuleSection>

      <ModuleSection
        icon={BarChart3}
        title={`${species}s : évolution`}
        subtitle="Poids, croissance, alimentation, santé, ventes, marge et coût par animal."
      >
        <AnimauxEvolution
          rows={speciesRows}
          alimentationLogs={props.alimentationLogs || []}
          vaccins={props.vaccins || []}
          businessEvents={props.businessEvents || []}
          opportunities={props.opportunities || []}
          onNavigate={props.onNavigate}
        />
      </ModuleSection>
    </div>
  );
}
