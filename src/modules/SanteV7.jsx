import { BarChart3, HeartPulse, ShieldCheck } from 'lucide-react';
import useCrudModule from '../hooks/useCrudModule';
import HealthQualityControl from './HealthQualityControl.jsx';
import SanteV6 from './SanteV6.jsx';
import SanteEvolution from './SanteEvolution.jsx';

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

export default function SanteV7(props) {
  const animauxCrud = useCrudModule('animaux');
  const avicoleCrud = useCrudModule('avicole');
  const onUpdateAnimal = props.onUpdateAnimal || animauxCrud.update;
  const onUpdateLot = props.onUpdateLot || avicoleCrud.update;
  const onRefreshAnimals = props.onRefreshAnimals || animauxCrud.refresh;
  const onRefreshLots = props.onRefreshLots || avicoleCrud.refresh;

  return (
    <div className="space-y-6 sante-mobile-structured">
      <style>{`@media (max-width: 640px){.sante-mobile-structured .rounded-2xl{border-radius:18px}.sante-mobile-structured table{font-size:12px}.sante-mobile-structured th,.sante-mobile-structured td{padding-left:10px!important;padding-right:10px!important}.sante-mobile-structured .text-2xl{font-size:1.35rem}.sante-mobile-structured .grid{gap:.75rem}.sante-mobile-structured .overflow-x-auto{max-width:100vw}}`}</style>

      <ModuleSection
        icon={HeartPulse}
        title="Soins, vaccins et biosécurité"
        subtitle="Créer et suivre les actes santé liés aux animaux, lots avicoles ou actions préventives."
      >
        <SanteV6 {...props} />
      </ModuleSection>

      <ModuleSection
        icon={ShieldCheck}
        title="Contrôle santé et cohérence stock"
        subtitle="Vérifie les soins en retard, produits utilisés, décréments stock et statuts des sujets."
      >
        <HealthQualityControl
          rows={props.rows || []}
          stocks={props.stocks || []}
          transactions={props.transactions || []}
          animaux={props.animaux || animauxCrud.rows || []}
          lots={props.lots || avicoleCrud.rows || []}
          onUpdate={props.onUpdate}
          onUpdateAnimal={onUpdateAnimal}
          onUpdateLot={onUpdateLot}
          onRefresh={props.onRefresh}
          onRefreshAnimals={onRefreshAnimals}
          onRefreshLots={onRefreshLots}
        />
      </ModuleSection>

      <ModuleSection
        icon={BarChart3}
        title="Évolution santé"
        subtitle="Graphes et suivi historique des soins, retards, préventifs et coûts santé."
      >
        <SanteEvolution
          rows={props.rows || []}
          onNavigate={props.onNavigate}
        />
      </ModuleSection>
    </div>
  );
}
